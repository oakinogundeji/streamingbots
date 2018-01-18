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
  BOT_PARAMS = JSON.parse(process.argv[2]),
  EMAIL = BOT_PARAMS.EMAIL,
  PWD = BOT_PARAMS.PWD,
  EMAIL_SELECTOR = '#ssc-liu',
  PWD_SELECTOR = '#ssc-lipw',
  LOGIN_BTN_SELECTOR = '#ssc-lis',
  RACE_URL = BOT_PARAMS.URL,
  RACES_CONTAINER_SELECTOR = '#main-wrapper > div > div.scrollable-panes-height-taker > div > div.page-content.nested-scrollable-pane-parent > div > div.bf-col-xxl-17-24.bf-col-xl-16-24.bf-col-lg-16-24.bf-col-md-15-24.bf-col-sm-14-24.bf-col-14-24.center-column.bfMarketSettingsSpace.bf-module-loading.nested-scrollable-pane-parent > div.scrollable-panes-height-taker.height-taker-helper > div > div.bf-row.main-mv-container > div > bf-main-market > bf-main-marketview > div > div.main-mv-runners-list-wrapper';


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
  //console.log('RACES_CONTAINER_SELECTOR found, continuing...');
  // bind to races container and lsiten for updates to oddsType, bets etc
  await page.$eval(RACES_CONTAINER_SELECTOR,
    target => {
      target.addEventListener('DOMSubtreeModified', function (e) {
        // check for most common element of back and lay as source of event
        if(e.target.parentElement.parentElement.parentElement.parentElement.className == 'runner-line') {
          // define variables
          let
            oddsType,
            betType,
            priceType,
            oddsValue,
            priceValue,
            horseName;
          // check if back or lay
          if(e.target.parentElement.parentElement.classList[0] == 'back') { // BACK
            betType = 'bet';
            if(e.target.parentElement.parentElement.className == 'back mv-bet-button back-button back-selection-button') {
              oddsType = 'bet-0';
              priceType = 'bet-price-0';
              if(e.target.className == 'bet-button-price') {
                oddsValue = e.target.innerText;
                priceValue = e.target.nextElementSibling.innerText;
              } else if(e.target.className == 'bet-button-size') {
                priceValue = e.target.innerText;
                oddsValue = e.target.previousElementSibling.innerText;
              }
            } else if(e.target.parentElement.parentElement.parentElement.nextElementSibling.className == 'bet-buttons back-cell last-back-cell') {
              oddsType = 'bet-1';
              priceType = 'bet-price-1';
              if(e.target.className == 'bet-button-price') {
                oddsValue = e.target.innerText;
                priceValue = e.target.nextElementSibling.innerText;
              } else if(e.target.className == 'bet-button-size') {
                priceValue = e.target.innerText;
                oddsValue = e.target.previousElementSibling.innerText;
              }
            } else if(e.target.parentElement.parentElement.parentElement.nextElementSibling.nextElementSibling.className == 'bet-buttons back-cell last-back-cell') {
              oddsType = 'bet-2';
              priceType = 'bet-price-2';
              if(e.target.className == 'bet-button-price') {
                oddsValue = e.target.innerText;
                priceValue = e.target.nextElementSibling.innerText;
              } else if(e.target.className == 'bet-button-size') {
                priceValue = e.target.innerText;
                oddsValue = e.target.previousElementSibling.innerText;
              }
            }
          } else if(e.target.parentElement.parentElement.classList[0] == 'lay') { // LAY
            betType = 'lay';
            if(e.target.parentElement.parentElement.className == 'lay mv-bet-button lay-button lay-selection-button') {
              oddsType = 'lay-0';
              priceType = 'lay-price-0';
              if(e.target.className == 'bet-button-price') {
                oddsValue = e.target.innerText;
                priceValue = e.target.nextElementSibling.innerText;
              } else if(e.target.className == 'bet-button-size') {
                priceValue = e.target.innerText;
                oddsValue = e.target.previousElementSibling.innerText;
              }
            } else if(e.target.parentElement.parentElement.parentElement.previousElementSibling.className == 'bet-buttons lay-cell first-lay-cell') {
              oddsType = 'lay-1';
              priceType = 'lay-price-1';
              if(e.target.className == 'bet-button-price') {
                oddsValue = e.target.innerText;
                priceValue = e.target.nextElementSibling.innerText;
              } else if(e.target.className == 'bet-button-size') {
                priceValue = e.target.innerText;
                oddsValue = e.target.previousElementSibling.innerText;
              }
            } else if(e.target.parentElement.parentElement.parentElement.previousElementSibling.previousElementSibling.className == 'bet-buttons lay-cell first-lay-cell') {
              oddsType = 'lay-2';
              priceType = 'lay-price-2';
              if(e.target.className == 'bet-button-price') {
                oddsValue = e.target.innerText;
                priceValue = e.target.nextElementSibling.innerText;
              } else if(e.target.className == 'bet-button-size') {
                priceValue = e.target.innerText;
                oddsValue = e.target.previousElementSibling.innerText;
              }
            }
          }
          if(!!betType && !!oddsType && !!priceType && !!oddsValue && !!priceValue) {
            horseName = e.target.parentElement.parentElement.parentElement.parentElement.children[0].children[0].children[1].children[0].children[0].children[0].children[2].innerText.split('\n')[0];
            const data = {
              betType,
              oddsType,
              priceType,
              oddsValue,
              priceValue,
              horseName
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
