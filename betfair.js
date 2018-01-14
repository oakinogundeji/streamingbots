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
  EMAIL = 'simon@percayso.com',
  PWD = 'Advantag3',
  EMAIL_SELECTOR = '#ssc-liu',
  PWD_SELECTOR = '#ssc-lipw',
  LOGIN_BTN_SELECTOR = '#ssc-lis',
  RACE_URL = 'https://www.betfair.com/exchange/plus/horse-racing/market/1.138901494',
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
  /*// navigate to betfair homepage
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
  await page.click(LOGIN_BTN_SELECTOR);*/
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
        // check for most common element of back and lay as source of event
        if(e.target.parentElement.parentElement.parentElement.parentElement.className == 'runner-line') {
          // define variables
          let
            odds,
            betType,
            amount,
            horseName,
            matchedAmount;
          // check if back or lay
          if(e.target.parentElement.parentElement.className == "back mv-bet-button back-button back-selection-button") {
            betType = 'bet';
            odds = e.target.innerText;
            amount = e.target.nextElementSibling.innerText;
          } else if(e.target.parentElement.parentElement.className == "lay mv-bet-button lay-button lay-selection-button") {
            betType = 'lay';
            odds = e.target.innerText;
            amount = e.target.nextElementSibling.innerText;
          } else if(e.target.previousElementSibling.parentElement.parentElement.className == "back mv-bet-button back-button back-selection-button") {// check if 'back' price change
            betType = 'bet';
            amount = e.target.textContent;
            odds = e.target.previousElementSibling.innerText
          }
          else if(e.target.previousElementSibling.parentElement.parentElement.className == "lay mv-bet-button lay-button lay-selection-button") {// check if 'lay' price change
            betType = 'lay';
            amount = e.target.textContent;
            odds = e.target.previousElementSibling.innerText;
          }
          if(!!betType && !!odds && !!amount) {
            horseName = e.target.parentElement.parentElement.parentElement.parentElement.children[0].children[0].children[1].children[0].children[0].children[0].children[2].innerText.split('\n')[0];
            const MATCHED_AMOUNT_SELECTOR = '#main-wrapper > div > div.scrollable-panes-height-taker > div > div.page-content.nested-scrollable-pane-parent > div > div.bf-col-xxl-17-24.bf-col-xl-16-24.bf-col-lg-16-24.bf-col-md-15-24.bf-col-sm-14-24.bf-col-14-24.center-column.bfMarketSettingsSpace.bf-module-loading.nested-scrollable-pane-parent > div.scrollable-panes-height-taker.height-taker-helper > div > div.bf-row.main-mv-container > div > bf-main-market > bf-main-marketview > div > div.mv-sticky-header > bf-marketview-header-wrapper > div > div > mv-header > div > div > div.mv-secondary-section > div > div > span.total-matched';
            matchedAmount = document.querySelector(MATCHED_AMOUNT_SELECTOR).innerText;
            const exchange = 'betfair';
            const data = {
              betType,
              odds,
              amount,
              horseName,
              matchedAmount,
              exchange
            };
            const output = JSON.stringify(data);
            console.log(output);
          }
        }
      }
    );
  });
}

// execute scraper
bot()
  .catch(err => console.error(err));
//=============================================================================
