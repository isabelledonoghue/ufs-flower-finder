const puppeteer = require('puppeteer');

// parse command line arguments
const args = process.argv.slice(2); 
let deliveryDate = '';
let flowerNames = [];
// get argument by flag
function getArgValue(flag) {
    const index = args.indexOf(flag);
    return index > -1 ? args[index + 1] : null;
}
// extract values
deliveryDate = getArgValue('--deliveryDate') || '';
flowerNames = getArgValue('--flowerNames') ? getArgValue('--flowerNames').split(',') : [
    "STOCK", "SNAPDRAGON", "SALAL", "DELPHINIUM", "ROSE", "CARNATION", "LISIANTHUS", "SCABIOSA", "MUMS", "RANUNCULUS", "ANEMONE", "EUCALYPTUS", "RUSCUS"
];
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

        // login to rooted farmers
        const url = "https://www.rootedfarmers.com/shop";
        const username = "shop@uniflowershop.com";
        const password = "RRShappydayz5!";

        await page.goto(url); // load page

        // automate login
        // username
        await page.waitForSelector('#login_email');
        await page.type('#login_email', username);
        // password
        await page.waitForSelector('#login_password');
        await page.type('#login_password', password);
        // submit button
        await page.waitForSelector('button[type="submit"]');
        await page.click('button[type="submit"]');
        console.log("clicked sign in button");
        await page.waitForNavigation();
        console.log("login success")


        // scrape flower data
        flowers = await scrapeData(page, flowers, currentDate);


    } catch (err) {
        console.error("error during login or page load:", err);
    } finally {
        if (browser) {
            await browser.close();
            console.log("closed browser");
        }
        console.log("scraped all data");
        console.log(JSON.stringify(flowers));
    }
})();


async function scrapeData(page, flowers, currentDate) {
    let hasNextPage = true;

    while (hasNextPage) {
        try {
            await page.waitForSelector('.ant-spin-container'); // wait for the product list to load
            console.log("table loaded");

            const newFlowers = await extractFlowerData(page, flowerNames, currentDate);
            console.log("scraped page", numPages);
            flowers = flowers.concat(newFlowers);
            console.log("added flowers");

            // check for next page button
            let nextPageLink;
            try {
                nextPageLink = await page.$('#next_gridPager');
                if (!nextPageLink) {
                    throw new Error("Next button not found");
                }
            } catch (err) {
                console.error("next button does not exist:", err.message);
                hasNextPage = false; // exit loop
                continue;
            }

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

                //console.log("next page", numPages)
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


async function extractFlowerData(page, flowerNames, date) {
    console.log("entered extractFlowerData")
    try {
        await page.waitForSelector('ul.ant-list-items');
        console.log("products loaded")

        return await page.evaluate((flowerNames, date) => {
            const items = document.querySelectorAll('ul.ant-list-items .ant-list-item');
            console.log("console: items selected")
    
            let flowersData = [];

            items.forEach(item => {
                // extracts flower name in all caps
                const flowerNameElement = item.querySelector('div.ant-space-item span.ant-typography');
                let flowerName = '';
                if (flowerNameElement) {
                    flowerName = flowerNameElement.textContent.trim().toUpperCase();
                }

                // check if current name matches name from flowerNames list
                const containsFlowerName = flowerNames.some(name => flowerName.includes(name));

                // scrapes matching available flowers
                if (containsFlowerName && itemAvail) {
                    // console.log("console: item avail", itemAvail)
                    //console.log("console: name ", flowerName)

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
                    const available = availableOnly ? `${availableOnly.replace(/\xa0/g, ' ')} (${unitsPer} per)` : '';
                    // console.log("console: availability ", available)

                    // delivery date passed in
                    const delivery = date;

                    // calculate price per one stem
                    let stemPrice = '0';
                    if (prices.includes('BU')) {
                        const priceVal = prices.match(/[\d.]+/);
                        //console.log("console: priceVal", priceVal);
                        if (priceVal) {
                            const pricePerBU = parseFloat(priceVal[0]);
                            //console.log("console: pricePerBU", pricePerBU);

                            const stemsPerMatch = stemsPer.match(/(\d+)/);
                            const stemsPerVal = stemsPerMatch ? parseFloat(stemsPerMatch[0]) : 0;
                            //console.log("console: stemsPerValue", stemsPerVal);

                            if (stemsPerVal > 0) {
                                stemPrice = (pricePerBU / stemsPerVal).toFixed(2);; // calc price per stem
                            } else {
                                stemPrice = '0'; // edge case
                            }
                            //console.log("console: stemPrice", stemPrice);
                        }
                    } else {
                        const cleanedPrices = prices.replace(/[^\d.]/g, '');
                        const priceVal = parseFloat(cleanedPrices);
                        stemPrice = !isNaN(priceVal) ? priceVal.toFixed(2) : '0';
                        //console.log("console: stemPrice", stemPrice);
                    }

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
                        stemPrice,
                        color,
                        height: '',
                        stemsPer,
                        seller: "Kennicott Direct",
                        farm,
                        available,
                        delivery
                    });
                }
            });
            return flowersData;
        }, flowerNames, date);
    } catch (err) {
        console.error("error during data extraction:", err);
        return [];
    }
}