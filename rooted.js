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
// HARDCODE
//deliveryDate = "2025-07-08"
//flowerNames = ["PAEONIA", "STOCK", "SNAPDRAGON", "SALAL", "DELPHINIUM", "ROSE", "CARNATION", "LISIANTHUS", "SCABIOSA", "MUMS", "RANUNCULUS", "ANEMONE", "EUCALYPTUS", "RUSCUS"];
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
        //console.log("loaded browser")

        // print browser console messages
        // page.on('console', async msg => {
        //     const args = await Promise.all(msg.args().map(arg => arg.jsonValue()));
        //     if (args.length > 0 && typeof args[0] === 'string' && args[0].includes("console:")) {
        //         console.log(`${args}`);
        //     }
        // });

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
        //console.log("clicked sign in button");
        await page.waitForNavigation();
        //console.log("login success")

        // convert delivery date from frontend into delivery date wanted
        // input - YYYY-MM-DD
        // output - MM/DD/YYYY
        const [inputYear, inputMonth, inputDay] = deliveryDate.split('-').map(Number);
        let formattedInputDate = new Date(inputYear, inputMonth - 1, inputDay);
        const inputMonthString = (formattedInputDate.getMonth() + 1).toString().padStart(2, '0');
        const inputDayString = formattedInputDate.getDate().toString().padStart(2, '0');
        const inputYearString = formattedInputDate.getFullYear();
        deliveryDate = `${inputMonthString}/${inputDayString}/${inputYearString}`;

        // scrape flower data
        flowers = await scrapeData(page, flowers, deliveryDate);

    } catch (err) {
        console.error("error during login or page load:", err);
    } finally {
        if (browser) {
            await browser.close();
            //console.log("closed browser");
        }
        //console.log("scraped all data");
        console.log(JSON.stringify(flowers));
    }
})();

function formatDeliveryDate(deliveryDate) {
    // split deliveryDate string into an array [MM, DD, YYYY]
    const [month, day, year] = deliveryDate.split('/');

    // return the formatted date as MM/DD without leading zeros
    return `${parseInt(month, 10)}/${parseInt(day, 10)}`;
}

async function scrapeData(page, flowers, deliveryDate) {
    let hasNextPage = true;

    while (hasNextPage) {
        try {
            await page.waitForSelector('.ant-spin-container'); // wait for the product list to load
            //console.log("table loaded");

            const newFlowers = await extractFlowerData(page, flowerNames, deliveryDate);
            //console.log("scraped page", numPages);
            flowers = flowers.concat(newFlowers);
            //console.log("added flowers");

            // check for next page button
            let nextPageButton;
            try {
                nextPageButton = await page.$('.ant-pagination-next button.ant-pagination-item-link');
                if (!nextPageButton) {
                    throw new Error("Next button not found");
                }
            } catch (err) {
                console.error("next button does not exist:", err.message);
                hasNextPage = false; // exit loop
                continue;
            }

            const isDisabled = await page.$eval('.ant-pagination-next button.ant-pagination-item-link', el => el.hasAttribute('disabled'));
            if (!isDisabled) {
                numPages += 1;
                await nextPageButton.click();
                //console.log("clicked next page");
                // wait for data reload
                await page.waitForFunction(
                    () => !document.querySelector('.ant-list-loading'),
                    { timeout: 10000 }
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

async function extractFlowerData(page, flowerNames, deliveryDate) {
    // format date
    date = formatDeliveryDate(deliveryDate);
    //console.log("entered extractFlowerData")
    try {
        await page.waitForSelector('ul.ant-list-items');
        //console.log("products loaded")

        return await page.evaluate(async (flowerNames, date, deliveryDate) => {
            const items = document.querySelectorAll('ul.ant-list-items .ant-list-item');
            //console.log("console: items selected")
    
            let flowersData = [];
            const promises = [];

            items.forEach(item => {
                // extracts flower name in all caps
                const flowerNameElement = item.querySelector('div.ant-space-item span.ant-typography b');
                let flowerName = '';
                if (flowerNameElement) {
                    flowerName = flowerNameElement.textContent.trim().toUpperCase();
                }
                //console.log("console: name ", flowerName)

                // check if current name matches name from flowerNames list
                const containsFlowerName = flowerNames.some(name => flowerName.includes(name));

                // scrapes matching available flowers
                if (containsFlowerName) {
                    //console.log("console: name ", flowerName)

                    // array of item delivery dates
                    const dateFound = false;
                    // click select button to render div
                    const selectButton = item.querySelector('button.ant-btn.ant-btn-primary.ant-btn-lg');
                    if (selectButton) {
                        selectButton.click();
                        //console.log("console: select button clicked");
                    }
                    // New div dynamically loaded
                    const promise = new Promise((resolve, reject) => {
                        const observer = new MutationObserver((mutationsList) => {
                            for (const mutation of mutationsList) {
                                if (mutation.type === 'childList') {
                                    const newDiv = document.querySelector('.ant-popover');
                                    if (newDiv) {
                                        // Extract date strings
                                        const dateElements = newDiv.querySelectorAll('button span.ant-typography');
                                        const dateStrings = Array.from(dateElements).map(element => element.textContent.trim());
                                        //console.log("console: extracted dates:", dateStrings.join(' '));

                                        // Check if any extracted date matches the passed 'date'
                                        if (dateStrings.includes(date)) {
                                            //console.log(`console: delivery date ${date} matched`);
                                            resolve(dateStrings);  // Resolve the promise with the extracted dates
                                            observer.disconnect();  // Stop observing after extraction
                                        }
                                    }
                                }
                            }
                        });

                        observer.observe(document.body, { childList: true, subtree: true });
                        setTimeout(() => {
                            //console.log("console: timeout reached, no date match found");
                            observer.disconnect();  // Stop observing
                            resolve([]);  // Resolve with an empty array to indicate no match
                        }, 5000);  // Adjust timeout as needed
                    });
                    promises.push(promise);

                    // scrape price
                    const priceElement = item.querySelector('div.ant-space-item span.ant-typography[aria-label="Current value"]');
                    const prices = priceElement ? priceElement.textContent.trim() : '';
                    //console.log("console: price ", prices)

                    // scrape color
                    const colorElement = item.querySelector('div.ant-space-item span.ant-badge-status-text span.ant-typography');
                    const color = colorElement ? colorElement.textContent.trim() : '';
                    //console.log("console: color ", color)

                    // scrape vendor/farm
                    const farmElement = item.querySelector('div.ant-space-item span.ant-typography a');
                    const farm = farmElement ? farmElement.textContent.trim() : '';
                    //console.log("console: farm", farm)

                    // scrape stems per
                    const stemsPerElement = item.querySelector('div.ant-space-item span.ant-typography');
                    let stemsPer = '';
                    if (stemsPerElement) {
                        const textContent = stemsPerElement.textContent.trim();
                        //console.log("console: stemsPerElement textContent", textContent);
                        const match = textContent.match(/\((\d+)\s+stems\s+\/\s+bunch\)/i);
                        if (match) {
                            stemsPer = match[1] + ' ST/BU';
                        }
                    }
                    //console.log("console: stemsPerBunch ", stemsPer);

                    // scrape stock available
                    const availabilityElement = item.querySelector('div.ant-space-item span.ant-typography[style="font-size: 14px;"]');
                    let available = '';
                    if (availabilityElement) {
                        const availabilityText = availabilityElement.textContent.trim();
                        //console.log("console: availabilityElement textContent", availabilityText);
                        const match = availabilityText.match(/(\d+)\s+bunches in stock/i);
                        available = match ? `${match[1]} BU` : '';
                    }
                    //console.log("console: availability ", available)

                    // delivery date passed in
                    const delivery = deliveryDate;

                    // price per one stem
                    const stemPriceElement = item.querySelector('div.ant-space-item span.ant-typography[aria-label="Current value"]');
                    const stemPrice = stemPriceElement ? stemPriceElement.textContent.trim().replace(/[^\d.]/g, '') : '';
                    //console.log("console: stemPrice", stemPrice);

                    // scrape height
                    const heightElement = item.querySelector('div.ant-space-item span.ant-typography[title="Stem length"]');
                    const height = heightElement ? heightElement.textContent.trim() : '';
                    //console.log("console: height", height);

                    // scrape image url
                    const imageElement = item.querySelector('div.ant-image img.ant-image-img');
                    const flowerImage = imageElement ? imageElement.src : '';
                    //console.log("console: flowerImage", flowerImage);

                    
                    flowersData.push({
                        flowerName,
                        flowerImage,
                        prices,
                        stemPrice,
                        color,
                        height,
                        stemsPer,
                        seller: "Rooted Farmers",
                        farm,
                        available,
                        delivery
                    });
                }
            });

            // check delivery date matches
            const resolvedDates = await Promise.all(promises);
            for (let i = resolvedDates.length - 1; i >= 0; i--) {
                if (!resolvedDates[i].includes(date)) {
                    flowersData.splice(i, 1);  // Remove flower data if no matching date found
                }
            }

            return flowersData;
        }, flowerNames, date, deliveryDate);
    } catch (err) {
        console.error("error during data extraction:", err);
        return [];
    }
}