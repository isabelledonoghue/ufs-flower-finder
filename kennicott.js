const puppeteer = require('puppeteer');

const flowerNames = ["STOCK", "SNAPDRAGON", "SALAL", "DELPHINIUM", "ROSE", "CARNATION", "LISIANTHUS", "SCABIOSA", "MUMS", "RANUNCULUS", "ANEMONE", "EUCALYPTUS", "RUSCUS"];
const deliveryDate = "2024-07-15"; // hardcoded for now, will need to be passed in from frontend
let numPages = 0;

(async () => {
    const browser = await puppeteer.launch(); // launches puppeteer browser instance
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
    await page.waitForSelector('#signInName'); // wait for load
    await page.evaluate((username) => {
        document.querySelector('#signInName').value = username;
    }, username);

    // password    
    await page.waitForSelector('#password'); // wait for load
    await page.evaluate((password) => {
        document.querySelector('#password').value = password;
    }, password);

    // submit form
    await page.evaluate(() => {
        document.getElementById('localAccountForm').submit();
    });
    // print form html
        // const HTML = await page.evaluate(() => {
        //     const element = document.querySelector('#localAccountForm');
        //     return element ? element.outerHTML : null;
        // });
        // console.log("HTML:", HTML);
    console.log("form submitted");

    await page.waitForNavigation(); // wait for nav
    console.log("login success")

    let flowers = [];
    let hasNextPage = true;

    while (hasNextPage) {
        console.log("entered page loop")
        await page.waitForSelector('.tblResults'); // wait for the product list to load
        console.log("table loaded")

        const newFlowers = await extractFlowerData(page, flowerNames);

        flowers = flowers.concat(newFlowers);

        // check if there is a next page
        const nextPageLink = await page.$('#next_gridPager');
        const isDisabled = await page.$eval('#next_gridPager', el => el.classList.contains('ui-state-disabled'));
        if (nextPageLink && !isDisabled) {
            numPages += 1;
            await nextPageLink.click();
            await page.waitForNavigation();
            console.log("next page", numPages)
        } else {
            hasNextPage = false;
        }
    }

    console.log("scraped all data")
    console.log(JSON.stringify(flowers));

    await browser.close();
    console.log("closed browser")
})();


async function extractFlowerData(page, flowerNames) {
    await page.waitForSelector('.product-item');
    console.log("products loaded")

    return await page.evaluate((flowerNames) => {
        const items = document.querySelectorAll('.product-item');
        console.log("console: items selected")
 
        let flowersData = [];

        items.forEach(item => {
            // extracts flower name in all caps
            const flowerNameElement = item.querySelector('td[aria-describedby="gridResults_productDescription"] .product-name');
            const flowerName = flowerNameElement ? flowerNameElement.textContent.trim().toUpperCase() : '';

            // check if current name matches name from flowerNames list
            const containsFlowerName = flowerNames.some(name => flowerName.includes(name));

            // scrapes matching flowers
            if (containsFlowerName) {
                console.log("console: name ", flowerName)

                // scrape flower image
                const flowerImageElement = item.querySelector('td[aria-describedby="gridResults_productDescription"] .image-preview img');
                const flowerImage = flowerImageElement ? flowerImageElement.getAttribute('src') : '';
                console.log("console: image ", flowerImage)

                // scrape price
                const priceElement = item.querySelectorAll('td[aria-describedby="gridResults_unitPriceFormatted"]');
                const prices = priceElement ? priceElement.getAttribute('title') : '';
                console.log("console: price ", prices)

                // scrape flower color
                const colorElement = item.querySelector('.hlx_plp_color');
                const color = colorElement ? colorElement.style.background : '';
                console.log("console: color ", color)

                // scrape height
                const heightElement = item.querySelector('.classification_attributes_block_details p');
                const height = heightElement ? heightElement.textContent.trim() : '';
                console.log("console: height ", height)

                // scrape stems per
                const stemsPerElement = item.querySelector('[aria-describedby="gridResults_units"]');
                const stemsPer = stemsPerElement ? stemsPerElement.getAttribute('title').trim() : '';
                console.log("console: stemsPerBunch ", stemsPer)

                // scrape vendor/farm
                const farmElement = row.querySelector('td[aria-describedby="gridResults_vendorName"]');
                const farm = farmElement ? farmElement.getAttribute('title') : '';

                // scrape stock available
                const availabilityElement = item.querySelector('[aria-describedby="gridResults_quantityText"]');
                const availability = availabilityElement ? availabilityElement.getAttribute('title').trim() : '';
                console.log("console: availability ", availability)

                // scrape delivery
                const deliveryDateElement = row.querySelector('td[aria-describedby="gridResults_realShipDate"]');
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
                    delivery,
                });
            }
        });
        return flowersData;
    }, flowerNames);
}
