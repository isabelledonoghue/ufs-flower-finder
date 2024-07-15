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
    const loginUrl = "https://holex.com/en_US/login";
    const username = "shop@uniflowershop.com";
    const password = "HEXhappydayz5!";

    await page.goto(loginUrl);

    await page.waitForSelector('#j_username'); // wait for load
    await page.type('#j_username', username);
    await page.waitForSelector('#j_password'); // wait for load
    await page.type('#j_password', password);

    // submit form directly
    await page.evaluate(() => {
        document.querySelector('#loginForm').submit();
    });
    await page.waitForNavigation(); // wait for login
    console.log("login success")

    // navigate to product page
    const productPageUrl = "https://holex.com/en_US/All-products/Flowers/c/Flowers";
    await page.goto(productPageUrl);
    console.log("navigated to product page")

    // handle delivery date popup (if it appears)
    const popupSelector = '#cboxContent';
    const popupHandle = await page.$(popupSelector);
    if (popupHandle) {
        // popup found, close it
        await page.click('#cboxClose');
        console.log("closed delivery date popup");
    } else {
        // popup not found, log message
        console.log("no delivery date popup found");
    }

    let flowers = [];
    let hasNextPage = true;

    while (hasNextPage) {
        console.log("entered page loop")
        await page.waitForSelector('section.version_two.product_grid_page.plus_font[page-name="productGridPage"]'); // wait for the product list to load
        console.log("page loaded")

        const newFlowers = await extractFlowerData(page, flowerNames);
        flowers = flowers.concat(newFlowers);

        // check if there is a next page
        const nextPageLink = await page.$('li.pagination-next.hidden-xs a');
        if (nextPageLink) {
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
    await page.waitForSelector('.product_list_item');
    console.log("products loaded")

    return await page.evaluate((flowerNames) => {
        const items = document.querySelectorAll('.tblResults tr[role="row"]');
        console.log("console: items selected")
        let flowersData = [];

        items.forEach(item => {
            // extracts flower name in all caps
            const flowerNameElement = item.querySelector('.name_fav a');
            const flowerName = flowerNameElement ? flowerNameElement.textContent.trim().toUpperCase() : '';

            // check if current name matches name from flowerNames list
            const containsFlowerName = flowerNames.some(name => flowerName.includes(name));

            // scrapes matching flowers
            if (containsFlowerName) {
                console.log("console: name ", flowerName)

                // scrape flower image
                const flowerImage = item.querySelector('img').getAttribute('src');
                console.log("console: image ", flowerImage)

                // scrape prices and corresponding quantities
                const priceElements = item.querySelectorAll('.price_text');
                const quantityElements = item.querySelectorAll('.stock_unit');
                const prices = [];
                // Ensure prices and quantities are stored together
                priceElements.forEach((priceElement, index) => {
                    const price = priceElement.textContent.trim();
                    const quantity = quantityElements[index] ? quantityElements[index].textContent.trim().replace('x', '').trim() : '';
                    if (price && quantity) {
                        console.log("console: price ", price, quantity)
                        prices.push({
                            price,
                            quantity
                        });
                    }
                });

                // scrape flower color
                const colorElement = item.querySelector('.hlx_plp_color');
                const color = colorElement ? colorElement.style.background : '';
                console.log("console: color ", color)

                // scrape height
                const heightElement = item.querySelector('.classification_attributes_block_details p');
                const height = heightElement ? heightElement.textContent.trim() : '';
                console.log("console: height ", height)

                const farm = item.querySelector('.country_icon_outer .text').innerText.trim();
                console.log("console: farm ", farm)

                // UPDATE if can
                const availability = '';
                const delivery = '';
                const stemsPer = '';

                flowersData.push({
                    flowerName,
                    flowerImage,
                    prices,
                    color,
                    height,
                    stemsPer,
                    seller: "Holex",
                    farm,
                    availability,
                    delivery
                });
            }
        });
        return flowersData;
    }, flowerNames);
}
