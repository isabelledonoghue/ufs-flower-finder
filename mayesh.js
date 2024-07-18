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

        // login to mayesh
        const loginUrl = "https://www.mayesh.com/login";
        const username = "shop@uniflowershop.com";
        const password = "MSHmorehappydayz5!";

        await page.goto(loginUrl);

        await page.waitForSelector('#input-email'); // wait for load
        await page.type('#input-email', username);
        await page.waitForSelector('#input-password'); // wait for load
        await page.type('#input-password', password);

        // submit login form
        await page.click('.btn-primary');
        console.log("filled login info")
        await page.waitForNavigation(); // wait for login
        console.log("login success")

        // LIVE & LOCAL, MIAMI BOXLOT, FARM DIRECT
        console.log("scraping all")
        // navigate to product page
        const productPageUrl = `https://www.mayesh.com/shop?perPage=100&sortBy=Name-ASC&pageNumb=1&date=${deliveryDate}&is_sales_rep=0&is_e_sales=0&criteria=%7B%7D&criteriaInt=%7B%7D&search=&s_search=`;
        await page.goto(productPageUrl);
        console.log("navigated to product page")

        let hasNextPage = true;

        while (hasNextPage) {
            try {
                console.log("entered page loop")
                await page.waitForSelector('#view-list'); // wait for the product list to load
                console.log("page loaded")

                const newFlowers = await extractFlowerData(page, flowerNames);
                flowers = flowers.concat(newFlowers);

                // check for next page
                const isLastPage = await page.evaluate(() => {
                    const pagination = document.querySelector('ul.pagination');
                    const activePage = pagination.querySelector('li.page-item.active');
                    const nextPage = activePage.nextElementSibling;
                    return nextPage === null;
                });
                console.log("is last page?", isLastPage);

                if (isLastPage) {
                    hasNextPage = false;
                } 
                else {
                    numPages += 1;
                    await page.click('ul.pagination li.page-item.active + li.page-item a.page-link');
                    await page.waitForNavigation();
                    console.log("next page", numPages);
                }
            } catch (err) {
                console.log("error during ALL pagination or scraping:", err);
                hasNextPage = false;
            }
        }

        // DUTCH DIRECT
        // navigate to product page
        const productUrl = `https://www.mayesh.com/dutch-direct-boxlots?perPage=100&sortBy=Name-ASC&pageNumb=1&date=${deliveryDate}&is_sales_rep=0&is_e_sales=0&criteria=%7B%7D&criteriaInt=%7B%7D&search=`;
        await page.goto(productUrl);
        console.log("navigated to dutch direct page")

        let nextPageExist = true;

        while (nextPageExist) {
            try {
                console.log("entered page loop")
                await page.waitForSelector('#view-list'); // wait for the product list to load
                console.log("page loaded")

                const newFlowers = await extractDutchData(page, flowerNames);
                flowers = flowers.concat(newFlowers);

                // check for next page
                const isLastPage = await page.evaluate(() => {
                    const pagination = document.querySelector('ul.pagination');
                    const activePage = pagination.querySelector('li.page-item.active');
                    const nextPage = activePage.nextElementSibling;
                    return nextPage === null;
                });
                console.log("is last page?", isLastPage);

                if (isLastPage) {
                    nextPageExist = false;
                } 
                else {
                    numPages += 1;
                    await page.click('ul.pagination li.page-item.active + li.page-item a.page-link');
                    await page.waitForNavigation();
                    console.log("next page", numPages);
                }
            } catch (err) {
                console.error("error during dutch direct pagination or scraping:", err);
                nextPageExist = false;
            }
        }
    } catch (err) {
        console.error("error during login or page load:", err);
    } finally {
        if (browser) {
            await browser.close();
            console.log("closed browser");
        }
        // shutdown
        console.log("scraped all data");
        console.log(JSON.stringify(flowers));
    }  
})();


async function extractFlowerData(page, flowerNames) {
    try {
        await page.waitForSelector('.card-body.position-relative');
        console.log("product loaded")

        return await page.evaluate((flowerNames) => {
            const items = document.querySelectorAll('.card-body.position-relative');
            console.log("console: items selected")
            let flowersData = [];

            items.forEach(item => {
                // extracts flower name in all caps
                const flowerNameElement = item.querySelector('.product-name a');
                const flowerName = flowerNameElement ? flowerNameElement.innerText.trim().toUpperCase() : '';

                // check if current name matches name from flowerNames list
                const containsFlowerName = flowerNames.some(name => flowerName.includes(name));

                // scrapes matching flowers
                if (containsFlowerName) {
                    console.log("console: name ", flowerName)

                    const flowerImageElement = item.querySelector('.product-img-wrap img');
                    const flowerImage = flowerImageElement ? flowerImageElement.getAttribute('src') : '';
                    console.log("console: img link ", flowerImage)

                    const avail = item.querySelectorAll('.lot-size span');
                    const available = avail[0] ? avail[0].innerText.trim() + ' BU' : '';
                    console.log("console: avail ", available)

                    let stemsPer = '';
                    if (avail[1]) {
                        stemsPer = avail[1].innerText.trim();
                        stemsPer = stemsPer.replace(/[()]/g, '');
                        stemsPer = stemsPer.replace(' stems', ' ST/BU');
                    }
                    console.log("console: stems per ", stemsPer)

                    const pricePerUnitElement = item.querySelector('.price strong');
                    const pricePerUnit = pricePerUnitElement ? pricePerUnitElement.innerText.trim() : '';        
                    const priceElement = item.querySelector('.lot-price');
                    const price = priceElement ? priceElement.innerText.trim().replace('Price', '').trim() : '';
                    const prices = [];
                    if (pricePerUnit) prices.push(pricePerUnit.replace(' / stem', ' /ST'));
                    if (price) prices.push(price.replace(' / bunch', ' /BU'));
                    console.log("console: format price", prices);

                    flowersData.push({
                        flowerName,
                        flowerImage,
                        prices,
                        color: 'N/A',
                        height: 'N/A',
                        stemsPer,
                        seller: "Mayesh",
                        farm: '',
                        available,
                        delivery: '',
                    });
                }
            });
            return flowersData;
        }, flowerNames);
    } catch (err) {
        console.error("error during all data extraction:", err);
        return [];
    }
}


async function extractDutchData(page, flowerNames) {
    try {
        await page.waitForSelector('.card-body.position-relative');
        console.log("product loaded")

        return await page.evaluate((flowerNames) => {
            const items = document.querySelectorAll('.card-body.position-relative');
            console.log("console: items selected")
            let flowersData = [];

            items.forEach(item => {
                // extracts flower name in all caps
                const flowerNameElement = item.querySelector('.product-name');
                let flowerName = flowerNameElement ? flowerNameElement.innerText.trim().toUpperCase() : '';
                flowerName = flowerName.replace(/HOLEX FLOWER\s*$/i, '').trim();

                // check if current name matches name from flowerNames list
                const containsFlowerName = flowerNames.some(name => flowerName.includes(name));

                // scrapes matching flowers
                if (containsFlowerName) {
                    console.log("console: name ", flowerName)

                    const flowerImageElement = item.querySelector('.product-img-wrap img');
                    const flowerImage = flowerImageElement ? flowerImageElement.getAttribute('src') : '';
                    console.log("console: img link ", flowerImage)

                    const stemsElement = item.querySelector('.lot-size span');
                    let stemsPer = '';
                    if (stemsElement) {
                        stemsPer = stemsElement.innerText.trim();
                        stemsPer = stemsPer.replace(/[()]/g, '');
                        stemsPer = stemsPer.replace(' stems', ' ST/BX');
                    }
                    console.log("console: stems per ", stemsPer);

                    const pricePerUnitElement = item.querySelector('.price b');
                    const pricePerUnit = pricePerUnitElement ? pricePerUnitElement.innerText.trim() : '';
                    const priceElement = item.querySelector('.lot-price');
                    const price = priceElement ? priceElement.innerText.trim().replace('Price', '').trim() : '';
                    const prices = [];
                    if (pricePerUnit) prices.push(pricePerUnit.replace(' / stem', ' /ST'));
                    if (price) prices.push(price.replace(' / box', ' /BX'));
                    console.log("console: format price", prices)

                    // missing
                    // scrape height
                    // const nameParts = flowerName.split(' ');
                    // const height = nameParts[nameParts.length - 1] || '';

                    flowersData.push({
                        flowerName,
                        flowerImage,
                        prices, 
                        color: '',
                        height: '',
                        stemsPer,
                        seller: "Mayesh",
                        farm: "DUTCH DIRECT",
                        available: '',
                        delivery: '',
                    });
                }
            });
            return flowersData;
        }, flowerNames);
    } catch (err) {
        console.log("error during dutch direct data extraction:", err);
        return [];
    }
}