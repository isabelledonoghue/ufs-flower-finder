// DUMMY ROOTED FILE USE ONLY FOR DEBUGGING
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
        //console.log("loaded browser")

        // print browser console messages
        // page.on('console', async msg => {
        //     const args = await Promise.all(msg.args().map(arg => arg.jsonValue()));
        //     if (args.length > 0 && args[0].includes("console:")) {
        //         console.log(`${args}`);
        //     }
        // });

        // login to kennicott
        const url = "https://www.rootedfarmers.com/account/sign-in";
        const username = "shop@uniflowershop.com";
        const password = "RRShappydayz5!";

        //await page.goto(url); // load home page

        // FOR FRONTEND DEBUG
        flowers.push({
            flowerName: 'ROSE',
            flowerImage: 'https://cdn.pixabay.com/photo/2023/11/06/09/43/lotus-8369252_1280.jpg',
            prices: '$12.00/BU, $1.20/ST',
            stemPrice: '2.00', 
            color: 'White',
            height: '20 cm',
            stemsPer: '120',
            seller: "Rooted Farmers",
            farm: 'LIVE & LOCAL',
            available: '10 BU',
            delivery: '10/20/2024',
        });

        // FOR FRONTEND DEBUG
        flowers.push({
            flowerName: 'CARNATION',
            flowerImage: 'https://cdn.pixabay.com/photo/2023/11/06/09/43/lotus-8369252_1280.jpg',
            prices: '$12.00/BU, $1.50/ST',
            stemPrice: '1.00', 
            color: 'Red',
            height: '10 cm',
            stemsPer: '100',
            seller: "Rooted Farmers",
            farm: 'Dutch Direct',
            available: '20 BU',
            delivery: '10/04/2024',
        });
                // FOR FRONTEND DEBUG
        flowers.push({
            flowerName: 'SALAL',
            flowerImage: 'https://cdn.pixabay.com/photo/2023/11/06/09/43/lotus-8369252_1280.jpg',
            prices: '$20.00/BU, $1.60/ST',
            stemPrice: '6.00', 
            color: 'Pink',
            height: '20 cm',
            stemsPer: '120',
            seller: "Rooted Farmers",
            farm: 'LIVE & LOCAL',
            available: '0 BU',
            delivery: '10/02/2024',
        });

        // FOR FRONTEND DEBUG
        flowers.push({
            flowerName: 'MUMS',
            flowerImage: 'https://cdn.pixabay.com/photo/2023/11/06/09/43/lotus-8369252_1280.jpg',
            prices: '$12.00/BU, $1.00/ST',
            stemPrice: '2.50', 
            color: 'Dark Red',
            height: '1 cm',
            stemsPer: '10',
            seller: "Rooted Farmers",
            farm: 'Dutch Direct',
            available: '75 BU',
            delivery: '10/01/2024',
        });

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

