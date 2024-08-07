const puppeteer = require('puppeteer');

const flowerNames = ["STOCK", "SNAPDRAGON", "SALAL", "DELPHINIUM", "ROSE", "CARNATION", "LISIANTHUS", "SCABIOSA", "MUMS", "RANUNCULUS", "ANEMONE", "EUCALYPTUS", "RUSCUS"];
const deliveryDate = "2024-08-06"; // hardcoded for now, will need to be passed in from frontend
let numPages = 0;

(async () => {
    let flowers = [];
    let browser = null;

    try {

        browser = await puppeteer.launch(); // launches puppeteer browser instance
        const page = await browser.newPage(); // opens new browser tab
        console.log("loaded browser")

        // print browser console messages
        page.on('console', async msg => {
            const args = await Promise.all(msg.args().map(arg => arg.jsonValue()));
            if (args.length > 0 && args[0].includes("console:")) {
                console.log(`${args}`);
            }
        });

        // login to holex
        const url = "https://shop.kennicott.com/";
        const username = "events@uniflowershop.com";
        const password = "StudioUFS212";

        await page.goto(url); // load home page

        // username
        await page.waitForSelector('#signInName'); // wait for username input
        await page.evaluate((username) => {
            document.querySelector('#signInName').value = username;
        }, username);
        const signInNameValue = await page.evaluate(() => document.querySelector('#signInName').value);
        //console.log('entered user:', signInNameValue);

        // password    
        await page.waitForSelector('#password'); // wait for password input
        await page.evaluate((password) => {
            document.querySelector('#password').value = password;
        }, password);
        const passwordValue = await page.evaluate(() => document.querySelector('#password').value);
        //console.log('entered pass:', passwordValue);

        // submit form
        await page.waitForSelector('#next', { visible: true }); // wait for the sign-in button
        await page.click('#next'); // click the sign-in button
        //console.log("clicked sign in button");
        await page.waitForNavigation(); // wait for nav
        console.log("login success");

        // format input delivery date
        const deliveryDateObj = new Date(deliveryDate);
        let currentDate = formatDate(deliveryDateObj);

        // loop through three different dates
        for (let i = 0; i < 3; i++) {
            console.log(`scraping data for delivery date: ${currentDate}`);
            // set the delivery date on the page
            await setDeliveryDate(page, currentDate);
            // scrape data for the current date
            flowers = flowers.concat(await scrapeData(page, flowers));
            // increment the date for the next iteration
            currentDate = incrementDate(currentDate);
        }
    } catch (err) {
        console.error("error during login or page load:", err);
    } finally {
        if (browser) {
            await browser.close();
            console.log("closed browser");
        }
        // console.log("scraped all data");
        console.log(JSON.stringify(flowers));
    }
})();


async function scrapeData(page, flowers) {
    let hasNextPage = true;

    while (hasNextPage) {
        try {
            console.log("entered page loop")
            await page.waitForSelector('.tblResults'); // wait for the product list to load
            // console.log("table loaded");

            const newFlowers = await extractFlowerData(page, flowerNames);
            // console.log("scraped page", numPages);
            flowers = flowers.concat(newFlowers);
            // console.log("added flowers");

            await page.waitForSelector('#next_gridPager', { visible: true }); // wait for next page link to load
            const nextPageLink = await page.$('#next_gridPager');
            const isDisabled = await page.$eval('#next_gridPager', el => el.classList.contains('ui-state-disabled'));
            if (!isDisabled) {
                // console.log("entered page if");
                numPages += 1;
                const initialPageValue = await page.$eval('.ui-pg-input', el => el.value); 

                await nextPageLink.click();
                // console.log("clicked next page");

                await page.waitForFunction(
                    (initialValue) => {
                        const currentValue = document.querySelector('.ui-pg-input').value;
                        return currentValue !== initialValue;
                    },
                    { timeout: 10000 },
                    initialPageValue
                );

                console.log("next page", numPages)
            } else {
                hasNextPage = false;
            }
        } catch (err) {
            console.error("error during pagination or scraping:", err);
            hasNextPage = false;
        }
    }
    return flowers;
}

// format date correctly
function formatDate(date) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${month}/${day}/${year}`;
}

// increment date by one day (handles last day month/yr)
function incrementDate(dateString) {
    // parse date string
    const [incMonth, incDay, incYear] = dateString.split('/').map(Number);
    const incDate = new Date(incYear, incMonth - 1, incDay);

    // increment the date by one day
    incDate.setDate(incDate.getDate() + 1);

    // format the new date
    formattedDate = formatDate(incDate);
    return formattedDate;
}

async function setDeliveryDate(page, currentDate) {
    try {
        await page.waitForSelector('#txtShipDate');
        await page.focus('#txtShipDate');

        // clear existing value
        await page.evaluate(() => {
            document.querySelector('#txtShipDate').value = '';
        });

        // submit new delivery date
        await page.type('#txtShipDate', currentDate, { delay: 100 });
        await page.keyboard.press('Enter');

        // wait for table to reload (loading disappears)
        await page.waitForFunction(() => {
            const loadingDiv = document.querySelector('#load_gridResults');
            return loadingDiv && window.getComputedStyle(loadingDiv).display === 'none';
        });
        console.log(`successfully set delivery date to ${currentDate}`);
    } catch (err) {
        console.error('error setting delivery date:', err);
    }
}


async function extractFlowerData(page, flowerNames) {
    console.log("entered extractFlowerData")
    try {
        await page.waitForSelector('tr');
        // console.log("products loaded")

        return await page.evaluate((flowerNames) => {
            const items = document.querySelectorAll('tr[role="row"]');
            //console.log("console: items selected")
    
            let flowersData = [];

            items.forEach(item => {
                // extracts flower name in all caps
                const flowerNameElement = item.querySelector('td[aria-describedby="gridResults_productDescription"] .product-name');
                const flowerName = flowerNameElement ? flowerNameElement.textContent.trim().toUpperCase() : '';

                // check if current name matches name from flowerNames list
                const containsFlowerName = flowerNames.some(name => flowerName.includes(name));

                // only scrape available flowers
                const itemAvail = !item.classList.contains('ecommerce-product-not-available');

                // scrapes matching available flowers
                if (containsFlowerName && itemAvail) {
                    // console.log("console: item avail", itemAvail)
                    console.log("console: name ", flowerName)

                    // scrape price
                    const priceElement = item.querySelector('td[aria-describedby="gridResults_unitPriceFormatted"]');
                    const prices = priceElement ? priceElement.getAttribute('title') : '';
                    // console.log("console: price ", prices)

                    // scrape color
                    const colorElement = item.querySelector('td[aria-describedby="gridResults_color"]');
                    const color = colorElement ? colorElement.getAttribute('title') : '';
                    // console.log("console: color ", color)

                    // scrape vendor/farm
                    const farmElement = item.querySelector('td[aria-describedby="gridResults_vendorName"]');
                    const farm = farmElement ? farmElement.getAttribute('title') : '';
                    // console.log("console: farm", farm)

                    // scrape stems per
                    const stemsPerElement = item.querySelector('td[aria-describedby="gridResults_units"]');
                    const stemsPer = stemsPerElement ? stemsPerElement.getAttribute('title').trim() + ' ST/BU' : '';
                    // console.log("console: stemsPerBunch ", stemsPer)

                    // scrape stock available, combine with unitsPer
                    const unitsPerElement = item.querySelector('td[aria-describedby="gridResults_packForShow"]');
                    const unitsPer = unitsPerElement ? unitsPerElement.getAttribute('title').trim() : '';
                    const availabilityElement = item.querySelector('td[aria-describedby="gridResults_quantityText"]');
                    const availableOnly = availabilityElement ? availabilityElement.getAttribute('title').trim() : '';
                    const available = availableOnly ? `${availableOnly} (${unitsPer} per)` : '';
                    // console.log("console: availability ", available)

                    // missing data - img and height
                    // const flowerImageElement = item.querySelector('td[aria-describedby="gridResults_productDescription"] .image-preview img');
                    // const flowerImage = flowerImageElement ? flowerImageElement.getAttribute('src') : '';
                    // const heightElement = item.querySelector('td[aria-describedby="gridResults_height"]');
                    // const height = heightElement ? heightElement.textContent.trim() : '';
                    // const deliveryDateElement = item.querySelector('td[aria-describedby="gridResults_realShipDate"]');
                    // const delivery = deliveryDateElement ? deliveryDateElement.getAttribute('title') : '';

                    flowersData.push({
                        flowerName,
                        flowerImage: '',
                        prices,
                        color,
                        height: 'N/A',
                        stemsPer,
                        seller: "Kennicott Direct",
                        farm,
                        available,
                        delivery: '', // represents ship date
                    });
                }
            });
            return flowersData;
        }, flowerNames);
    } catch (err) {
        // console.error("error during data extraction:", err);
        return [];
    }
}
