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
        browser = await puppeteer.launch(); // launches puppeteer browser instance
        const page = await browser.newPage(); // opens new browser tab
        //console.log("loaded browser")

        //print browser console messages
        // page.on('console', async msg => {
        //     const args = await Promise.all(msg.args().map(arg => arg.jsonValue()));
        //     if (args.length > 0 && args[0].includes("console:")) {
        //         console.error(`${args}`);
        //     }
        // });

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
        //console.log("login success")

        // navigate to product page
        const productPageUrl = "https://holex.com/en_US/All-products/Flowers/c/Flowers";
        await page.goto(productPageUrl);
        //console.log("navigated to product page")

        // handle delivery date popup (if it appears)
        const popupSelector = '#cboxContent';
        const popupHandle = await page.$(popupSelector);
        if (popupHandle) {
            // popup found, close it
            await page.click('#cboxClose');
            //console.log("closed delivery date popup");
        } else {
            //console.log("no delivery date popup found");
        }

        // convert delivery date from frontend into delivery date wanted
        // input - YYYY-MM-DD
        // output - MM/DD/YYYY
        const [inputYear, inputMonth, inputDay] = deliveryDate.split('-').map(Number);
        let formattedInputDate = new Date(inputYear, inputMonth - 1, inputDay);
        const inputMonthString = (formattedInputDate.getMonth() + 1).toString().padStart(2, '0');
        const inputDayString = formattedInputDate.getDate().toString().padStart(2, '0');
        const inputYearString = formattedInputDate.getFullYear();
        deliveryDate = `${inputMonthString}/${inputDayString}/${inputYearString}`;

        // check if original delivery date is found and available
        const { inputDateFound, inputDateAvail } = await findInputDate(page, deliveryDate);
        //console.log("input date status:", inputDateFound, inputDateAvail);

        // ensure input date is found
        if (inputDateFound) {
            // input date is disabled, move to first open date
            if (inputDateAvail) {
                await selectDeliveryDate(page, deliveryDate);
                //console.log("selected delivery date:", deliveryDate);
                // loop through each page
                let hasNextPage = true;
                while (hasNextPage) {
                    try {
                        //console.log("entered page loop")
                        await page.waitForSelector('section.version_two.product_grid_page.plus_font[page-name="productGridPage"]'); // wait for the product list to load
                        //console.log("page loaded")
                        const newFlowers = await extractFlowerData(page, flowerNames, deliveryDate);
                        flowers = flowers.concat(newFlowers);

                        // check if there is a next 
                        const nextPageLink = await page.$('li.pagination-next.hidden-xs a');
                        //console.log("nextPageLink = ", nextPageLink);

                        if (nextPageLink) {
                            numPages += 1;
                            await page.waitForSelector('li.pagination-next.hidden-xs a');
                            //prev error await nextPageLink.click();
                            await page.$eval('li.pagination-next.hidden-xs a', el => el.click());
                            await page.waitForNavigation();
                            //console.log("next page", numPages)
                        } else {
                            //console.log("last page")
                            hasNextPage = false;
                        }
                    } catch (err) {
                        console.error("error during pagination or scraping:", err);
                        hasNextPage = false;
                    }
                    //console.log("hasNextPage = ", hasNextPage);
                }
            }
        }
        else {
            //console.log("input date was not found")
        }
    } catch (err) {
        console.error("error during login or page load:", err);
    } finally {
        if (browser) {
            await browser.close();
            //console.log("closed browser");
        }
        //console.log("scraped all data")
        console.log(JSON.stringify(flowers));
    }
})();


async function findInputDate(page, deliveryDate) {
    //console.log("entered findInputDate");

    // click on calendar
    await page.waitForSelector('.js-custom_datepicker');
    await page.click('.js-custom_datepicker');

    // wait for calendar to appear
    await page.waitForSelector('.bootstrap-datetimepicker-widget');

    // get date table
    const days = await page.$$('.bootstrap-datetimepicker-widget .datepicker-days td[data-action="selectDay"]');

    let inputDateFound = false;
    let inputDateAvail = false;

    for (const day of days) {
        const { dayDate, isDisabled } = await page.evaluate(el => {
            return {
                dayDate: el.getAttribute('data-day'),
                isDisabled: el.classList.contains('disabled')
            };
        }, day);

        if (dayDate === deliveryDate) {
            inputDateFound = true;
            inputDateAvail = !isDisabled;
            //console.log(`date ${deliveryDate} is ${inputDateAvail ? 'available' : 'disabled'}`);
            break; // exit loop once the date is found
        }
    }

    if (!inputDateFound) {
        //console.log(`date ${deliveryDate} not found in the calendar`);
    }
    return { inputDateFound, inputDateAvail };
}

async function selectDeliveryDate(page, deliveryDate) {
    //console.log("entered selectDeliveryDate");

    const deliveryDateSelector = '.js-custom_datepicker';
    const popupSelector = '#cboxLoadedContent';
    const confirmButtonSelector = '.confirm_select_date';

    // click on calendar
    await page.waitForSelector(deliveryDateSelector);
    await page.click(deliveryDateSelector);

    // wait for calendar to appear
    await page.waitForSelector('.bootstrap-datetimepicker-widget');

    // navigate to correct month and year in calendar
    await navigateCalendar(page, deliveryDate);

    // find all day elements in the calendar
    const days = await page.$$('.bootstrap-datetimepicker-widget .datepicker-days td[data-action="selectDay"]');

    // iterate through days to find the correct date
    for (const day of days) {
        const dayValue = await page.evaluate(el => el.getAttribute('data-day'), day);
        if (dayValue === deliveryDate) {
            //console.log(`clicking date: ${deliveryDate}`);
            await day.click();

            // handle confirmation popup
            await page.waitForSelector(popupSelector, { timeout: 5000 }).catch(() => null);
            //console.log("popup appeared");
            const popupHandle = await page.$(popupSelector);
            if (popupHandle) {
                // click confirm button
                const confirmButton = await page.$(confirmButtonSelector);
                if (confirmButton) {
                    await confirmButton.click();
                    await page.waitForNavigation();
                    //console.log("clicked confirm button");
                } else {
                    //console.log("continue button not found in popup");
                }
            } else {
                //console.log("popup not found");
            }
            return; // exit the function after selecting the date and handling the popup
        }
    }
    //console.log(`date ${deliveryDate} not found or is disabled`);
}


async function navigateCalendar(page, deliveryDate) {
    // click on calendar
    await page.waitForSelector('.js-custom_datepicker');
    await page.click('.js-custom_datepicker');
    
    // wait for calendar to appear
    await page.waitForSelector('.bootstrap-datetimepicker-widget');

    // select title from calendar
    const calendarTitleSelector = '.bootstrap-datetimepicker-widget .picker-switch';
    
    // parse month and year from current deliveryDate
    const [month, day, year] = deliveryDate.split('/');
    const deliveryMonth = parseInt(month, 10); // convert into M
    const deliveryYear = parseInt(year, 10); // convert into YYYY
    //console.log("delivery date month, year", deliveryMonth, deliveryYear);

    // extract month and year from calendar title
    const getCalendarTitle = async () => {
        return await page.$eval(calendarTitleSelector, el => el.textContent.trim());
    };

    let calendarTitle = await getCalendarTitle();
    let [calendarMonthName, calendarYear] = calendarTitle.split(' ');
    let calendarMonth = new Date(Date.parse(calendarMonthName + " 1, 2024")).getMonth() + 1; // converts month name to num (1-12)
    let calendarYearNumber = parseInt(calendarYear, 10);
    //console.log("cal month, year", calendarMonth, calendarYearNumber);

    // navigate to correct month year in calendar
    while (deliveryMonth !== calendarMonth || deliveryYear !== calendarYearNumber) {
        await page.click('.bootstrap-datetimepicker-widget .next');
        //console.log("navigated to next month");
        calendarTitle = await getCalendarTitle();
        [calendarMonthName, calendarYear] = calendarTitle.split(' ');
        calendarMonth = new Date(Date.parse(calendarMonthName + " 1, 2024")).getMonth() + 1;
        calendarYearNumber = parseInt(calendarYear, 10);
        //console.log("cal month, year", calendarMonth, calendarYearNumber);
    }
    //console.log("cal month, year", calendarMonth, calendarYearNumber);
}


async function extractFlowerData(page, flowerNames, currDeliveryDate) {
    //console.log("entered extractFlowerData for date:", currDeliveryDate);
    try {
        await page.waitForSelector('.product_list_item');
        //console.log("products loaded")

        return await page.evaluate((flowerNames, currDeliveryDate) => {
            const items = document.querySelectorAll('.product_list_item');
            //console.log("console: items selected", items)
            let flowersData = [];

            items.forEach(item => {
                // extracts flower name in all caps
                const flowerNameElement = item.querySelector('.name_fav a');
                const flowerName = flowerNameElement ? flowerNameElement.textContent.trim().toUpperCase() : '';
                //console.log("console: flower name:", flowerName);

                // check if current name matches name from flowerNames list
                const containsFlowerName = flowerNames.some(name => flowerName.includes(name));

                // scrapes matching flowers
                if (containsFlowerName) {
                    //console.log("console: name ", flowerName)

                    // scrape flower image
                    const flowerImageElement = item.querySelector('img');
                    const flowerImage = flowerImageElement ? flowerImageElement.getAttribute('src') : '';
                    //console.log("console: image ", flowerImage)

                    // scrape prices and corresponding quantities
                    const priceElements = item.querySelectorAll('.price_text');
                    const quantityElements = item.querySelectorAll('.stock_unit');
                    const allPrices = [];
                    let stemPrice = '0';

                    // ensure prices and quantities stored together
                    priceElements.forEach((priceElement, index) => {
                        const price = priceElement ? priceElement.textContent.trim() : '';
                        const quantity = quantityElements[index] ? quantityElements[index].textContent.trim().replace('x', '').trim() : '';
                        if (price && quantity) {
                            //const formattedPrice = `${price}/${quantity} stems`;
                            const formattedPrice = `${price.replace('$ ', '$').trim()}/${quantity} ST`;;
                            allPrices.push(formattedPrice);
                        }
                    });
                    const prices = allPrices.join(', '); // convert to string

                    // set stemPrice
                    if (allPrices.length > 0) {
                        const priceMatch = allPrices[0].match(/\$([\d.]+)/);
                        stemPrice = priceMatch ? priceMatch[1] : '0';
                    }
                    //console.log("console: stemPrice, prices", stemPrice, prices)


                    // scrape flower color
                    const colorElement = item.querySelector('.hlx_plp_color');
                    const color = colorElement ? colorElement.style.background : '';
                    // format color correctly
                    if (color.includes('conic-gradient')) {
                        color = 'assorted';
                    }
                    
                    //console.log("console: color ", color)

                    // scrape height
                    const heightElement = item.querySelector('.classification_attributes_block_details p');
                    const height = heightElement ? heightElement.textContent.trim() : '';
                    // console.log("console: height ", height)

                    const farmElement = item.querySelector('.country_icon_outer .text');
                    const farm = farmElement ? farmElement.innerText.trim() : '';
                    // console.log("console: farm ", farm)

                    // delivery is date passed in
                    const delivery = currDeliveryDate;
                    //console.log("console: delivery date", delivery)

                    flowersData.push({
                        flowerName,
                        flowerImage,
                        prices,
                        stemPrice,
                        color,
                        height,
                        stemsPer: ' ',
                        seller: "Holex",
                        farm,
                        available: ' ',
                        delivery
                    });
                }
            });
            return flowersData;
        }, flowerNames, currDeliveryDate);
    } catch (err) {
        console.error("error during data extraction:", err);
        return [];
    }
}
