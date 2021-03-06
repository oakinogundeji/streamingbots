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
  HOMEPAGE_URL = 'https://smarkets.com/',
  EMAIL = '',
  PWD = '',
  ACCESS_LOGIN_SELECTOR = '#right-nav-section-login > div.right-nav-section-content > a:nth-child(2)',
  EMAIL_SELECTOR = '#login-form-email',
  PWD_SELECTOR = '#login-form-password',
  SIGN_BTN_SELECTOR = '#login-page > div.form-page-content > form > button',
  RACE_URL = 'https://smarkets.com/event/887113/sport/horse-racing/dundalk/2018/01/12/17:30',
  RACES_CONTAINER_SELECTOR = 'ul.contracts';


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
  // navigate to smarkets homepage
  await page.goto(HOMEPAGE_URL, {
    waitUntil: 'networkidle0'
  });
  // click the button to access login
  await page.click(ACCESS_LOGIN_SELECTOR);
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
  await page.click(SIGN_BTN_SELECTOR);
  // navigate to RACE_URL
  await page.goto(RACE_URL, {
    waitUntil: 'networkidle0'
  });
  // ensure race container selector available
  //console.log(`${RACES_CONTAINER_SELECTOR}`);
  await page.waitForSelector(RACES_CONTAINER_SELECTOR);
  console.log('RACES_CONTAINER_SELECTOR found, continuing...');
  // allow 'page' instance to output any calls to browser log to node log
  page.on('console', data => console.log(data.text()));
  // bind to races container and lsiten for updates to odds, bets etc
  await page.$eval(RACES_CONTAINER_SELECTOR,
    target => {
      target.addEventListener('DOMSubtreeModified', function (e) {
        // define variables
        let
          odds,
          betType,
          amount,
          horseName,
          matchedAmount;
        // check if event from odds or price
        if(
          (e.target.parentElement.parentElement.parentElement.className == 'level-0 tick')
          ||
          (e.target.parentElement.parentElement.className == 'level-0 tick')
        ) {
          // check if odds
          if(e.target.className == 'formatted-price numeric-value') {
            odds = e.target.textContent;
            // check if bet or lay
            if(
              e.target.parentElement.parentElement.children[0].currentSrc == 'https://smarkets.com/static/img/price-dark-blue-no-flash.png'
            ) {
              betType = 'lay';
            } else {
              betType = 'bet';
            }
          } else if(e.target.className == 'formatted-currency numeric-value') {
            amount = e.target.textContent;
            odds = odds = e.target.parentElement.parentElement.children[0].children[1].textContent;
            if(e.target.parentElement.parentElement.children[0].children[0].currentSrc == 'https://smarkets.com/static/img/price-dark-blue-no-flash.png') {
              betType = 'lay';
            } else {
              betType = 'bet';
            }
          }
          amount = e.target.parentElement.parentElement.parentElement.children[1].children[0].textContent;
          const MATCHED_AMOUNT_SELECTOR = '#contract-collapse-6917893-control > div > div.contract-group-stats > span > span > span';
          matchedAmount = document.querySelector(MATCHED_AMOUNT_SELECTOR).innerText;
          const HORSE_NAME_SELECTOR = '#contract-collapse-6917893 > div > ul > li:nth-child(1) > div > div.contract-name-column > div.contract-info.-horse-racing > div.name-info > div.name';
          horseName = document.querySelector(HORSE_NAME_SELECTOR).innerText;
          console.log(`
          odds: ${odds},
          amount: ${amount},
          betType: ${betType},
          horseName: ${horseName},
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
