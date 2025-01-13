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
// HARDCODE DEBUG
//deliveryDate = "2024-10-02"
//flowerNames = ["STOCK", "SNAPDRAGON", "SALAL", "DELPHINIUM", "ROSE", "CARNATION", "LISIANTHUS", "SCABIOSA", "MUMS", "RANUNCULUS", "ANEMONE", "EUCALYPTUS", "RUSCUS"];

deliveryDate = getArgValue('--deliveryDate') || '';
flowerNames = getArgValue('--flowerNames') ? getArgValue('--flowerNames').split(',') : [
    "STOCK", "SNAPDRAGON", "SALAL", "DELPHINIUM", "ROSE", "CARNATION", "LISIANTHUS", "SCABIOSA", "MUMS", "RANUNCULUS", "ANEMONE", "EUCALYPTUS", "RUSCUS"
];
let numPages = 0;

(async () => {
    let flowers = [];
    let browser = null;

    try {

        //browser = await puppeteer.launch(); // launches puppeteer browser instance
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        const page = await browser.newPage(); // opens new browser tab
        //console.log("loaded browser")

        // print browser console messages
        // page.on('console', async msg => {
        //     const args = await Promise.all(msg.args().map(arg => arg.jsonValue()));
        //     if (args.length > 0 && args[0].includes("console:")) {
        //         console.log(`${args}`);
        //     }
        // });

        // login to kennicott
        const url = "https://shop.kennicott.com/";
        const username = "events@uniflowershop.com";
        const password = "StudioUFS212";

        await page.goto(url); // load home page

        // username
        await page.waitForSelector('#signInName'); // wait for username input
        await page.evaluate((username) => {
            document.querySelector('#signInName').value = username;
        }, username);
        //const signInNameValue = await page.evaluate(() => document.querySelector('#signInName').value);
        //console.log('entered user:', signInNameValue);

        // password    
        await page.waitForSelector('#password'); // wait for password input
        await page.evaluate((password) => {
            document.querySelector('#password').value = password;
        }, password);
        //const passwordValue = await page.evaluate(() => document.querySelector('#password').value);
        //console.log('entered pass:', passwordValue);

        // submit form
        await page.waitForSelector('#next', { visible: true }); // wait for the sign-in button
        await page.click('#next'); // click the sign-in button
        //console.log("clicked sign in button");
        await page.waitForNavigation(); // wait for nav
        //console.log("login success");

        // format input delivery date
        const deliveryDateObj = new Date(deliveryDate);
        let currentDate = formatDate(deliveryDateObj);
        // set the delivery date on the page
        const setDate = await setDeliveryDate(page, currentDate);

        // scrape data
        if (setDate) {
            //console.log("set date successfully")
            flowers = await scrapeData(page, flowers, currentDate);
        }
    } catch (err) {
        console.error("error during login or page load:", err);
    } finally {
        if (browser) {
            await browser.close();
            //console.log("closed browser");
        }
        // console.log("scraped all data");
        console.log(JSON.stringify(flowers));
    }
})();


async function scrapeData(page, flowers, currentDate) {
    let hasNextPage = true;

    while (hasNextPage) {
        try {
            // page loop")
            await page.waitForSelector('.tblResults'); // wait for the product list to load
            // console.log("table loaded");

            const newFlowers = await extractFlowerData(page, flowerNames, currentDate);
            // console.log("scraped page", numPages);
            flowers = flowers.concat(newFlowers);
            // console.log("added flowers");

            // check for next page button
            //await page.waitForSelector('#next_gridPager', { visible: true }); // wait for next page link to load
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

// format date correctly
function formatDate(date) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${month}/${day}/${year}`;
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

        // ERROR HANDLING
        // check for error popup
        const noProductsModal = await page.$('.modal-container');
        if (noProductsModal) {
            const noProductsMessage = await page.$eval('.modal-container .modal-title label', el => el.textContent);
            if (noProductsMessage.includes('There are no products available')) {
                await page.click('#button0'); // click OK button
                //console.log('no products popup for the selected date.');
                return false;
            }
        }
        // check if table is empty
        const emptyTableRow = await page.$('tr.trEcommerceInventoryNoResults');
        if (emptyTableRow) {
            const displayStyle = await page.evaluate(el => window.getComputedStyle(el).display, emptyTableRow);
            if (displayStyle === 'table-row') {
                //console.log('table is empty for the selected date');
                return false;
            }
        }

        // wait for table to reload if no errors found
        await page.waitForFunction(
            () => {
                const loadingDiv = document.querySelector('#load_gridResults');
                return loadingDiv && window.getComputedStyle(loadingDiv).display === 'none';
            },
            { timeout: 10000 });
        //console.log(`successfully set delivery date to ${currentDate}`);
        return true;
    } catch (err) {
        console.error('error setting delivery date:', err);
        return false;
    }
}


async function extractFlowerData(page, flowerNames, date) {
    //console.log("entered extractFlowerData")
    try {
        await page.waitForSelector('tr');
        // console.log("products loaded")

        return await page.evaluate((flowerNames, date) => {
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
