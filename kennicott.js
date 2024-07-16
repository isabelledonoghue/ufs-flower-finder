const puppeteer = require('puppeteer');

const flowerNames = ["STOCK", "SNAPDRAGON", "SALAL", "DELPHINIUM", "ROSE", "CARNATION", "LISIANTHUS", "SCABIOSA", "MUMS", "RANUNCULUS", "ANEMONE", "EUCALYPTUS", "RUSCUS"];
const deliveryDate = "2024-07-18"; // hardcoded for now, will need to be passed in from frontend
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
        const password = "KTThappydayz5!";

        await page.goto(url); // load home page

        // username
        await page.waitForSelector('#signInName'); // wait for username input
        await page.evaluate((username) => {
            document.querySelector('#signInName').value = username;
        }, username);
        const signInNameValue = await page.evaluate(() => document.querySelector('#signInName').value);
        console.log('entered user:', signInNameValue);

        // password    
        await page.waitForSelector('#password'); // wait for password input
        await page.evaluate((password) => {
            document.querySelector('#password').value = password;
        }, password);
        const passwordValue = await page.evaluate(() => document.querySelector('#password').value);
        console.log('entered pass:', passwordValue);

        // submit form
        await page.waitForSelector('#next'); // wait for the sign-in button
        await page.click('#next'); // click the sign-in button
        console.log("form submitted");

        await page.waitForNavigation(); // wait for nav
        console.log("login success")

        let hasNextPage = true;

        while (hasNextPage) {
            try {
                console.log("entered page loop")
                await page.waitForSelector('.tblResults'); // wait for the product list to load
                console.log("table loaded")

                const newFlowers = await extractFlowerData(page, flowerNames);
                console.log("scraped page", numPages)
                flowers = flowers.concat(newFlowers);
                console.log("added flowers")

                const nextPageLink = await page.$('#next_gridPager .ui-pg-button');
                const isDisabled = await page.$eval('#next_gridPager', el => el.classList.contains('ui-state-disabled'));
                // DEBUG
                //console.log("next page info: ", nextPageLink, isDisabled);
                const buttonHTML = await page.evaluate(element => element.outerHTML, nextPageLink);
                console.log('HTML of the next page button:', buttonHTML);
                
                if (!isDisabled) {
                    console.log("entered page if")
                    numPages += 1;
                    await nextPageLink.click();
                    console.log("clicked next page")

                    await page.waitForNavigation(); // BUG HERE
                    console.log("next page", numPages)
                } else {
                    hasNextPage = false;
                }
            } catch (err) {
                console.error("error during pagination or scraping:", err);
                hasNextPage = false;
            }
        }
    } catch (err) {
        console.error("error during login or page load:", err);
    } finally {
        if (browser) {
            await browser.close();
            console.log("closed browser");
        }
        console.log("scraped all data")
        console.log(JSON.stringify(flowers));
    }
})();


async function extractFlowerData(page, flowerNames) {
    try {
        await page.waitForSelector('tr');
        console.log("products loaded")

        return await page.evaluate((flowerNames) => {
            const items = document.querySelectorAll('tr[role="row"]');
            console.log("console: items selected")
    
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
                    console.log("console: item avail", itemAvail)
                    console.log("console: name ", flowerName)

                    // scrape flower image
                    const flowerImageElement = item.querySelector('td[aria-describedby="gridResults_productDescription"] .image-preview img');
                    const flowerImage = flowerImageElement ? flowerImageElement.getAttribute('src') : '';
                    console.log("console: image ", flowerImage)

                    // scrape price
                    const priceElement = item.querySelector('td[aria-describedby="gridResults_unitPriceFormatted"]');
                    const prices = priceElement ? priceElement.getAttribute('title') : '';
                    console.log("console: price ", prices)

                    // scrape color
                    //const colorElement = item.querySelector('.hlx_plp_color');
                    //const color = colorElement ? colorElement.style.background : '';
                    const colorElement = item.querySelector('td[aria-describedby="gridResults_color"]');
                    const color = colorElement ? colorElement.getAttribute('title') : '';
                    console.log("console: color ", color)

                    // scrape height
                    //const heightElement = item.querySelector('.classification_attributes_block_details p');
                    //const height = heightElement ? heightElement.textContent.trim() : '';
                    const heightElement = item.querySelector('td[aria-describedby="gridResults_height"]');
                    const height = heightElement ? heightElement.textContent.trim() : '';
                    console.log("console: height ", height)

                    // scrape vendor/farm
                    const farmElement = item.querySelector('td[aria-describedby="gridResults_vendorName"]');
                    const farm = farmElement ? farmElement.getAttribute('title') : '';
                    console.log("console: farm", farm)

                    // scrape stems per
                    const stemsPerElement = item.querySelector('td[aria-describedby="gridResults_units"]');
                    const stemsPer = stemsPerElement ? stemsPerElement.getAttribute('title').trim() : '';
                    console.log("console: stemsPerBunch ", stemsPer)

                    // scrape units per box
                    const unitsPerElement = item.querySelector('td[aria-describedby="gridResults_packForShow"]');
                    const unitsPer = unitsPerElement ? unitsPerElement.getAttribute('title').trim() : '';
                    console.log("console: unitsPer ", unitsPer)

                    // scrape stock available
                    const availabilityElement = item.querySelector('td[aria-describedby="gridResults_quantityText"]');
                    const availability = availabilityElement ? availabilityElement.getAttribute('title').trim() : '';
                    console.log("console: availability ", availability)

                    // scrape delivery
                    const deliveryDateElement = item.querySelector('td[aria-describedby="gridResults_realShipDate"]');
                    const delivery = deliveryDateElement ? deliveryDateElement.getAttribute('title') : '';
                    console.log("console: delivery ", delivery)

                    flowersData.push({
                        flowerName,
                        flowerImage,
                        prices,
                        color,
                        height,
                        stemsPer,
                        seller: "Kennicott Direct",
                        farm,
                        availability,
                        delivery, // represents ship date
                    });
                }
            });
            return flowersData;
        }, flowerNames);
    } catch (err) {
        console.error("error during data extraction:", err);
        return [];
    }
}
