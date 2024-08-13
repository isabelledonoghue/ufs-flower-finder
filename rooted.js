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
            flowerName: '',
            flowerImage: '',
            prices: '',
            stemPrice: '', 
            color: '',
            height: '',
            stemsPer: '',
            seller: "Rooted Farmers",
            farm: '',
            available: '',
            delivery: '',
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

