const puppeteer = require('puppeteer');

const flowerNames = ["STOCK", "SNAPDRAGON", "SALAL", "DELPHINIUM", "ROSE", "CARNATION", "LISIANTHUS", "SCABIOSA", "MUMS", "RANUNCULUS", "ANEMONE", "EUCALYPTUS", "RUSCUS"];
const deliveryDate = "2024-07-18"; // hardcoded for now, will need to be passed in from frontend
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
    await page.waitForNavigation(); // wait for login
    console.log("login success")

    // navigate to product page
    const productUrl = `https://www.mayesh.com/dutch-direct-boxlots?perPage=100&sortBy=Name-ASC&pageNumb=1&date=${deliveryDate}&is_sales_rep=0&is_e_sales=0&criteria=%7B%7D&criteriaInt=%7B%7D&search=`;
    await page.goto(productUrl);
    console.log("navigated to product page")

    let dutchFlowers = [];
    let hasNextPage = true;

    while (hasNextPage) {
        console.log("entered page loop")
        await page.waitForSelector('#view-list'); // wait for the product list to load
        console.log("page loaded")

        const newFlowers = await extractFlowerData(page, flowerNames);
        dutchFlowers = dutchFlowers.concat(newFlowers);

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
    }

    // shutdown
    console.log("scraped all data")
    //console.log(JSON.stringify(dutchFlowers));
    await browser.close();
    console.log("closed browser")
})();



async function extractFlowerData(page, flowerNames) {
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

                const flowerImage = item.querySelector('.product-img-wrap img').getAttribute('src');
                console.log("console: img link ", flowerImage)

                const stemsElement = item.querySelector('.lot-size span');
                let stemsPer = '';
                if (stemsElement) {
                    stemsPer = stemsElement.innerText.trim();
                    stemsPer = stemsPer.replace(/[()]/g, '');
                }
                console.log("console: stems per ", stemsPer);

                const pricePerUnitElement = item.querySelector('.price b');
                const pricePerUnit = pricePerUnitElement ? pricePerUnitElement.innerText.trim() : '';
                console.log("console: unit price ", pricePerUnit)
    
                const pricePerBoxElement = item.querySelector('.lot-price');
                const pricePerBox = pricePerBoxElement ? pricePerBoxElement.innerText.trim().replace('Price', '').trim() : '';
                console.log("console: box price ", pricePerBox)
            
                const nameParts = flowerName.split(' ');
                const height = nameParts[nameParts.length - 1];
                console.log("console: height", height)

                // missing
                const color = '';
                const availability = '';
                const delivery = '';

                flowersData.push({
                    flowerName,
                    flowerImage,
                    pricePerUnit, // DIFF FROM SQL BASE
                    pricePerBox, // DIFF FROM SQL BASE
                    color,
                    height,
                    stemsPer,
                    seller: "Mayesh",
                    farm: "Dutch Direct",
                    availability, // empty here
                    delivery
                });
            }
        });
        return flowersData;
    }, flowerNames);
}