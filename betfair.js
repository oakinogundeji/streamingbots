/**
 * created by Muyi on 12-01-2018
 */
//=============================================================================
'use strict';
//=============================================================================
// dependencies
const P = require('puppeteer');

// module variables
const
  LOGIN_URL = 'https://www.betfair.com/sport',
  EMAIL = '',
  PWD = '',
  EMAIL_SELECTOR = '#ssc-liu',
  PWD_SELECTOR = '#ssc-lipw',
  LOGIN_BTN_SELECTOR = '#ssc-lis',
  RACE_URL = 'https://www.betfair.com/exchange/plus/horse-racing/market/1.138777581',
  RACES_CONTAINER_SELECTOR = '#main-wrapper > div > div.scrollable-panes-height-taker > div > div.page-content.nested-scrollable-pane-parent > div > div.bf-col-xxl-17-24.bf-col-xl-16-24.bf-col-lg-16-24.bf-col-md-15-24.bf-col-sm-14-24.bf-col-14-24.center-column.bfMarketSettingsSpace.bf-module-loading.nested-scrollable-pane-parent > div.scrollable-panes-height-taker.height-taker-helper > div > div.bf-row.main-mv-container > div > bf-main-market > bf-main-marketview > div > div.main-mv-runners-list-wrapper > bf-marketview-runners-list.runners-list-unpinned > div > div';


// define scraper function

async function bot() {
  // instantiate browser
  const browser = await P.launch({
    headless: false
  });
  // create blank page
  const page = await browser.newPage();
  // set viewport to 1366*768
  await page.setViewport({width: 1366, height: 768});
  // set the user agent
  await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko)');
  // navigate to betfair homepage
  await page.goto(LOGIN_URL, {
    waitUntil: 'networkidle0'
  });
  // wait for EMAIL and PWD selectors to be available
  await page.waitForSelector(EMAIL_SELECTOR);
  await page.waitForSelector(PWD_SELECTOR);
  // enter email
  await page.type(EMAIL_SELECTOR, EMAIL, {delay: 100});
  await page.waitFor(2*1000);
  //enter password
  await page.type(PWD_SELECTOR, PWD, {delay: 100});
  await page.waitFor(2*1000);
  // click login button
  await page.click(LOGIN_BTN_SELECTOR);
  // navigate to RACE_URL
  await page.goto(RACE_URL, {
    waitUntil: 'networkidle0'
  });
  // ensure race container selector available
  //console.log(`${RACES_CONTAINER_SELECTOR}`);
  await page.waitForSelector(RACES_CONTAINER_SELECTOR);
  // allow 'page' instance to output any calls to browser log to node log
  page.on('console', data => console.log(data.text()));
  console.log('RACES_CONTAINER_SELECTOR found, continuing...');
  // bind to races container and lsiten for updates to odds, bets etc
  await page.$eval(RACES_CONTAINER_SELECTOR,
    target => {
      target.addEventListener('DOMSubtreeModified', function (e) {
        if((e.target.parentElement.parentElement.className == "lay mv-bet-button lay-button lay-selection-button")
        ||
        (e.target.parentElement.parentElement.className == "back mv-bet-button back-button back-selection-button")) {
          // changed value
          //console.log(e.target.textContent);
          const changedVal = e.target.textContent;
          let staticVal;
          if(!!e.target.nextElementSibling) {
            // unchanged value
            //console.log(e.target.nextElementSibling.textContent);
            staticVal = e.target.nextElementSibling.textContent;
            } else {
              //console.log(e.target.previousElementSibling.textContent);
              staticVal = e.target.previousElementSibling.textContent;
            }
          // horse name
          //console.log(e.target.parentElement.parentElement.parentElement.parentElement.children[0].children[0].children[1].children[0].children[0].children[0].children[2].innerText.split('\n')[0]);
          const horse_name = e.target.parentElement.parentElement.parentElement.parentElement.children[0].children[0].children[1].children[0].children[0].children[0].children[2].innerText.split('\n')[0];
          // race name static value, so we can do that once for all on the controller
          // matched amount dynamic so we run a query
          const MATCHED_AMOUNT_SELECTOR = '#main-wrapper > div > div.scrollable-panes-height-taker > div > div.page-content.nested-scrollable-pane-parent > div > div.bf-col-xxl-17-24.bf-col-xl-16-24.bf-col-lg-16-24.bf-col-md-15-24.bf-col-sm-14-24.bf-col-14-24.center-column.bfMarketSettingsSpace.bf-module-loading.nested-scrollable-pane-parent > div.scrollable-panes-height-taker.height-taker-helper > div > div.bf-row.main-mv-container > div > bf-main-market > bf-main-marketview > div > div.mv-sticky-header > bf-marketview-header-wrapper > div > div > mv-header > div > div > div.mv-secondary-section > div > div > span.total-matched';
          const matchedAmount = document.querySelector(MATCHED_AMOUNT_SELECTOR).innerText;
          // final output
          console.log(`
            changedVal: ${changedVal},
            staticVal: ${staticVal},
            horse_name: ${horse_name},
            matchedAmount: ${matchedAmount}
            `
          );
        }
      }
    );
  });
}

// execute scraper
bot()
  .catch(err => console.error(err));
//=============================================================================
