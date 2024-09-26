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
        //console.log("filled login info")
        await page.waitForNavigation(); // wait for login
        //console.log("login success")

        // scrape ALL for multiple dates
        // start at input date first
        let currentDate = new Date(deliveryDate);
        let numAttempts = 0;
        
        for (let numScrapes = 0; numScrapes < 3;) {
            if (numAttempts < 5) {
                // count number of date change attempts
                numAttempts++;
                //console.log("attempt number:", numAttempts);
                // reset pages count
                numPages = 0;
                try {
                    // format current date
                    const dateString = formatDate(currentDate);
                    //console.log("dateString:", dateString)

                    // navigate in current date url
                    const productPageUrl = `https://www.mayesh.com/shop?perPage=100&sortBy=Name-ASC&pageNumb=1&date=${dateString}&is_sales_rep=0&is_e_sales=0&criteria=%7B%7D&criteriaInt=%7B%7D&search=&s_search=`;
                    await page.goto(productPageUrl);
                    //await page.waitForNavigation();
                    //console.log("navigated to product page");

                    // DEBUG find current url
                    //const currentUrl = await page.url();
                    //console.log("current url:", currentUrl);

                    // access date that actually populates at url (will default to actual date if invalid)
                    // await page.waitForSelector('div.input-group.flex-nowrap input.form-control');
                    await page.waitForSelector('div.input-group.flex-nowrap input.form-control');
                    let inputValue = await page.evaluate(() => {
                        const input = document.querySelector('div.input-group.flex-nowrap input.form-control');
                        //console.log("console: input element", input);
                        return input ? input.value : null;
                    });
                    //console.log("input value prior:", inputValue);
                    const [month, day, year] = inputValue.split('-');
                    inputValue = `${year}-${month}-${day}`;
                    //console.log('inputValue:', inputValue);

                    if (inputValue == dateString) {
                        //console.log("valid date");
                        flowers = await scrapeAllDate(page, dateString, flowers);
                        //console.log("scraped date:", dateString);
                        // increment date
                        currentDate = incrementDate(currentDate);
                        //console.log("incremented to date:", currentDate);
                        numScrapes++;
                    } else {
                        //console.log("invalid date");
                        currentDate = incrementDate(currentDate);
                        //console.log("incremented to date:", currentDate);
                    }
                } catch (err) {
                    console.error(`error when scraping date ${formatDate(currentDate)}:`, err);
                }
            } else {
                break;
            }
        }

        // scrape DUTCH for all dates
        // start at input date first
        currentDate = new Date(deliveryDate);
        let numDutchAttempts = 0;
        
        for (let numDutchScrapes = 0; numDutchScrapes < 3;) {
            if (numDutchAttempts < 5) {
                // count number of date change attempts
                numDutchAttempts++;
                // reset pages count
                numPages = 0;
                try {
                    // format current date
                    const dateString = formatDate(currentDate);
                    //console.log("dateString:", dateString)

                    // navigate in current date url
                    const productPageUrl = `https://www.mayesh.com/shop?perPage=100&sortBy=Name-ASC&pageNumb=1&date=${dateString}&is_sales_rep=0&is_e_sales=0&criteria=%7B%7D&criteriaInt=%7B%7D&search=&s_search=`;
                    await page.goto(productPageUrl);
                    //await page.waitForNavigation();
                    //console.log("navigated to product page");

                    // DEBUG find current url
                    //const currentUrl = await page.url();
                    //console.log("current url:", currentUrl);

                    // access date that actually populates at url (will default to actual date if invalid)
                    // await page.waitForSelector('div.input-group.flex-nowrap input.form-control');
                    await page.waitForSelector('div.input-group.flex-nowrap input.form-control');
                    let inputValue = await page.evaluate(() => {
                        //const input = document.querySelector('div.input-group.flex-nowrap input.form-control');
                        const input = document.querySelector('div.input-group.flex-nowrap input.form-control');
                        //console.log("input element:", input);
                        return input ? input.value : null;
                    });
                    //console.log("input value prior:", inputValue);
                    const [month, day, year] = inputValue.split('-');
                    inputValue = `${year}-${month}-${day}`;
                    //console.log('inputValue:', inputValue);

                    if (inputValue == dateString) {
                        //console.log("valid date");
                        flowers = await scrapeDutchDate(page, dateString, flowers);
                        //console.log("scraped date:", dateString);
                        // increment date
                        currentDate = incrementDate(currentDate);
                        //console.log("incremented to date:", currentDate);
                        numDutchScrapes++;
                    } else {
                        //console.log("invalid date");
                        currentDate = incrementDate(currentDate);
                        //console.log("incremented to date:", currentDate);
                    }
                } catch (err) {
                    console.error(`error when scraping date ${formatDate(currentDate)}:`, err);
                }
            } else {
                break;
            }
        }
    } catch (err) {
        console.error("error during login or page load:", err);
    } finally {
        if (browser) {
            await browser.close();
            //console.log("closed browser");
        }
        // shutdown
        //console.log("scraped all data");
        console.log(JSON.stringify(flowers));
    }  
})();

// format date object to YYYY-MM-DD
function formatDate(date) {
    //console.log("format Date object", date);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// increment date by one day (handles last day month/yr)
function incrementDate(date) {
    //console.log("increment Date object", date);
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + 1);
    return newDate;
}

async function scrapeAllDate(page, date, flowers) {
    // LIVE & LOCAL, MIAMI BOXLOT, FARM DIRECT
    //console.log("scraping all at date:", date);

    let hasNextPage = true;
    while (hasNextPage) {
        try {
            //console.log("entered page loop")
            await page.waitForSelector('#view-list'); // wait for the product list to load
            const newFlowers = await extractFlowerData(page, flowerNames, date);
            flowers = flowers.concat(newFlowers);

            // check for next page
            const isLastPage = await page.evaluate(() => {
                const pagination = document.querySelector('ul.pagination');
                const activePage = pagination.querySelector('li.page-item.active');
                const nextPage = activePage.nextElementSibling;
                return nextPage === null;
            });
            //console.log("is last page?", isLastPage);

            if (isLastPage) {
                hasNextPage = false;
            } 
            else {
                numPages += 1;
                await page.click('ul.pagination li.page-item.active + li.page-item a.page-link');
                await page.waitForNavigation();
                //console.log("next page", numPages);
            }
        } catch (err) {
            console.error("error during ALL pagination or scraping:", err);
            hasNextPage = false;
        }
    }
    return flowers;
}

async function extractFlowerData(page, flowerNames, currentDate) {
    //console.log("extractFlowerData date arg:", date);
    try {
        await page.waitForSelector('.card-body.position-relative');
        //console.log("product loaded")

        // format date to MM/DD/YYYY
        const [year, month, day] = currentDate.split('-');
        date = `${month}/${day}/${year}`;

        return await page.evaluate((flowerNames, date) => {
            //console.log("console: extractFlowerData date arg:", date);
            
            const items = document.querySelectorAll('.card-body.position-relative');
            //console.log("console: items selected")
            let flowersData = [];

            // find farm corresponding to delivery date
            let farm = '';
            const checkboxElements = document.querySelectorAll('ul.filters li input[type="checkbox"]');
            checkboxElements.forEach(checkbox => {
                const parentLi = checkbox.parentElement;
                if (parentLi) {
                    const text = parentLi.textContent.trim();
                    if (text.includes('Live & Local')) {
                        farm = 'LIVE & LOCAL';
                    } else if (text.includes('Farm Direct Boxlots')) {
                        farm = 'FARM DIRECT';
                    } else if (text.includes('Miami Direct Boxlots')) {
                        farm = 'MIAMI DIRECT';
                    }
                } 
            });

            items.forEach(item => {
                // extracts flower name in all caps
                const flowerNameElement = item.querySelector('.product-name a');
                const flowerName = flowerNameElement ? flowerNameElement.innerText.trim().toUpperCase() : '';

                // check if current name matches name from flowerNames list
                const containsFlowerName = flowerNames.some(name => flowerName.includes(name));

                // scrapes matching flowers
                if (containsFlowerName) {
                    //console.log("console: name ", flowerName)

                    const flowerImageElement = item.querySelector('.product-img-wrap img');
                    const flowerImage = flowerImageElement ? flowerImageElement.getAttribute('src') : '';
                    //console.log("console: img link ", flowerImage)

                    const avail = item.querySelectorAll('.lot-size span');
                    const available = avail[0] ? avail[0].innerText.trim() + ' BU' : '';
                    //console.log("console: avail ", available)

                    let stemsPer = '';
                    if (avail[1]) {
                        stemsPer = avail[1].innerText.trim();
                        stemsPer = stemsPer.replace(/[()]/g, '');
                        stemsPer = stemsPer.replace(' stems', ' ST/BU');
                    }
                    //console.log("console: stems per ", stemsPer)

                    const pricePerUnitElement = item.querySelector('.price strong');
                    const pricePerUnitVal = pricePerUnitElement ? pricePerUnitElement.innerText.trim() : '0'; 
                    const numericValue = pricePerUnitVal.match(/[\d.]+/);
                    if (numericValue) {
                        stemPrice = parseFloat(numericValue[0]).toFixed(2);
                    } else {
                        stemPrice = '0';
                    }

                    let prices = '0';
                    const priceElement = item.querySelector('.lot-price');
                    const price = priceElement ? priceElement.innerText.trim().replace('Price', '').trim() : '';
                    if (price) prices = price.replace(' / bunch', ' /BU');
                    //console.log("console: stem and price", stemPrice, prices);

                    // delivery date
                    const delivery = date;
                    
                    flowersData.push({
                        flowerName,
                        flowerImage,
                        prices,
                        stemPrice,
                        color: " ",
                        height: " ",
                        stemsPer,
                        seller: "Mayesh",
                        farm,
                        available,
                        delivery
                    });
                }
            });
            return flowersData;
        }, flowerNames, date);
    } catch (err) {
        console.error("error during all data extraction:", err);
        return [];
    }
}

async function scrapeDutchDate(page, date, flowers) {
    // navigate to product page
    //const productUrl = `https://www.mayesh.com/dutch-direct-boxlots?perPage=100&sortBy=Name-ASC&pageNumb=1&date=${date}&is_sales_rep=0&is_e_sales=0&criteria=%7B%7D&criteriaInt=%7B%7D&search=`;
    //await page.goto(productUrl);
    //console.log("navigated to dutch direct page")

    let nextPageExist = true;

    while (nextPageExist) {
        try {
            //console.log("entered page loop")
            await page.waitForSelector('#view-list'); // wait for the product list to load
            //console.log("page loaded")

            const newFlowers = await extractDutchData(page, flowerNames, date);
            flowers = flowers.concat(newFlowers);

            // check for next page
            const isLastPage = await page.evaluate(() => {
                const pagination = document.querySelector('ul.pagination');
                const activePage = pagination.querySelector('li.page-item.active');
                const nextPage = activePage.nextElementSibling;
                return nextPage === null;
            });
            //console.log("is last page?", isLastPage);

            if (isLastPage) {
                nextPageExist = false;
            } 
            else {
                numPages += 1;
                await page.click('ul.pagination li.page-item.active + li.page-item a.page-link');
                await page.waitForNavigation();
                //console.log("next page", numPages);
            }
        } catch (err) {
            console.error("error during dutch direct pagination or scraping:", err);
            nextPageExist = false;
        }
    }
    return flowers;
}


async function extractDutchData(page, flowerNames, currentDate) {
    try {
        await page.waitForSelector('.card-body.position-relative');
        //console.log("product loaded")

        // format date to MM/DD/YYYY
        const [year, month, day] = currentDate.split('-');
        date = `${month}/${day}/${year}`;

        return await page.evaluate((flowerNames, date) => {
            const items = document.querySelectorAll('.card-body.position-relative');
            //console.log("console: items selected")
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
                    //console.log("console: name ", flowerName);

                    const flowerImageElement = item.querySelector('.product-img-wrap img');
                    const flowerImage = flowerImageElement ? flowerImageElement.getAttribute('src') : '';
                    //console.log("console: img link ", flowerImage)

                    const stemsElement = item.querySelector('.lot-size span');
                    let stemsPer = '';
                    if (stemsElement) {
                        stemsPer = stemsElement.innerText.trim();
                        stemsPer = stemsPer.replace(/[()]/g, '');
                        stemsPer = stemsPer.replace(' stems', ' ST/BX');
                    }
                    //console.log("console: stems per ", stemsPer);

                    const pricePerUnitElement = item.querySelector('.price b');
                    const pricePerUnitVal = pricePerUnitElement ? pricePerUnitElement.innerText.trim() : '0';
                    const numericValue = pricePerUnitVal.match(/[\d.]+/);
                    if (numericValue) {
                        stemPrice = parseFloat(numericValue[0]).toFixed(2);
                    } else {
                        stemPrice = '0';
                    }

                    let prices = '0';
                    const priceElement = item.querySelector('.lot-price');
                    const price = priceElement ? priceElement.innerText.trim().replace('Price', '').trim() : '';
                    if (price) prices = (price.replace(' / box', ' /BX'));
                    //console.log("console: stem and price", stemPrice, prices);

                    // missing
                    // scrape height
                    // const nameParts = flowerName.split(' ');
                    // const height = nameParts[nameParts.length - 1] || '';

                    const delivery = date;
                    //console.log("console: delivery, date", date);

 
                }
            });
            return flowersData;
        }, flowerNames, date);
    } catch (err) {
        console.error("error during dutch direct data extraction:", err);
        return [];
    }
}