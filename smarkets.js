/**
 * created by Muyi on 12-01-2018
 */
//=============================================================================
'use strict';
if(process.env.NODE_ENV != 'production') {
  require('dotenv').config();
}
//=============================================================================
// dependencies
const P = require('puppeteer');

// module variables
const
  EMAIL = process.env.EMAIL,
  PWD = process.env.SMARKETS_PWD,
  RACE_URL = process.env.SMARKETS_URL,
  RUNNER = process.argv[2],
  ACCESS_LOGIN_SELECTOR = '#right-nav-section-login > div.right-nav-section-content > a:nth-child(2)',
  EMAIL_SELECTOR = '#login-form-email',
  PWD_SELECTOR = '#login-form-password',
  SHOW_PWD_SELECTOR = '#login-page > div.form-page-content > form > div:nth-child(2) > div > div > span.after > button',
  SIGNIN_BTN_SELECTOR = '#login-page > div.form-page-content > form > button',
  RACES_CONTAINER_SELECTOR = '#main-content > main > div > div:nth-child(3) > ul > li:nth-child(1)';


// define scraper function

async function bot() {
  // instantiate browser
  const browser = await P.launch({
    headless: false,
    timeout: 180000
  });
  // create blank page
  const page = await browser.newPage();
  // set viewport to 1366*768
  await page.setViewport({width: 1366, height: 768});
  // set the user agent
  await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko)');
  // navigate to RACE_URL
  await page.goto(RACE_URL, {
    waitUntil: 'networkidle2',
    timeout: 180000
  });
  // ensure ACCESS_LOGIN_SELECTOR is available
  await page.waitForSelector(ACCESS_LOGIN_SELECTOR);
  // click the button to access login
  await page.click(ACCESS_LOGIN_SELECTOR);
  // wait for EMAIL and PWD selectors to be available
  await page.waitForSelector(EMAIL_SELECTOR);
  await page.waitForSelector(PWD_SELECTOR);
  // enter email
  await page.type(EMAIL_SELECTOR, EMAIL, {delay: 100});
  await page.waitFor(2*1000);
  // click show pwd btn
  await page.click(SHOW_PWD_SELECTOR);
  //enter password
  await page.type(PWD_SELECTOR, PWD, {delay: 100});
  await page.waitFor(2*1000);
  // click login button
  await page.click(SIGNIN_BTN_SELECTOR);
  // ensure race container selector available
  await page.waitForSelector(RACES_CONTAINER_SELECTOR);
  // allow 'page' instance to output any calls to browser log to node log
  page.on('console', data => console.log(data.text()));
  // bind to races container and lsiten for updates to odds, bets etc
  await page.$eval(RACES_CONTAINER_SELECTOR,
    (target, RUNNER) => {
      target.addEventListener('DOMSubtreeModified', function (e) {
        // define variables
        let
          betType,
          odds,
          liquidity;
        // check if event from odds or price matched cols
        if(e.target.parentElement.parentElement.parentElement.parentElement.className == 'prices offers') {// ODDS BACK
          if((e.target.parentElement.parentElement.children[0].currentSrc == 'https://smarkets.com/static/img/price-dark-green-no-flash.png') && (e.target.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.children[0].children[0].children[1].innerText.split('\n')[0] == RUNNER)) {
            betType = 'b0';
            odds = e.target.innerText;
          } else if((e.target.parentElement.parentElement.parentElement.previousElementSibling.children[0].children[0].currentSrc == 'https://smarkets.com/static/img/price-dark-green-no-flash.png') && (e.target.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.children[0].children[0].children[1].innerText.split('\n')[0] == RUNNER)) {
            betType = 'b1';
            odds = e.target.innerText;
          } else if((e.target.parentElement.parentElement.parentElement.previousElementSibling.previousElementSibling.children[0].children[0].currentSrc == 'https://smarkets.com/static/img/price-dark-green-no-flash.png') && (e.target.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.children[0].children[0].children[1].innerText.split('\n')[0] == RUNNER)) {
            betType = 'b2';
            odds = e.target.innerText;
          }
        } else if(e.target.parentElement.parentElement.parentElement.parentElement.className == 'prices bids') {// ODDS LAY
          if((e.target.parentElement.parentElement.children[0].currentSrc == 'https://smarkets.com/static/img/price-dark-blue-no-flash.png') && (e.target.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.children[0].children[0].children[1].innerText.split('\n')[0] == RUNNER)) {
            betType = 'l0';
            odds = e.target.innerText;
          } else if((e.target.parentElement.parentElement.parentElement.previousElementSibling.children[0].children[0].currentSrc == 'https://smarkets.com/static/img/price-dark-blue-no-flash.png') && (e.target.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.children[0].children[0].children[1].innerText.split('\n')[0])) {
            betType = 'l1';
            odds = e.target.innerText;
          } else if((e.target.parentElement.parentElement.parentElement.previousElementSibling.previousElementSibling.children[0].children[0].currentSrc == 'https://smarkets.com/static/img/price-dark-blue-no-flash.png') && (e.target.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.children[0].children[0].children[1].innerText.split('\n')[0] == RUNNER)) {
            betType = 'l2';
            odds = e.target.innerText;
          }
        } else if(e.target.parentElement.parentElement.parentElement.className == 'prices offers') {// LIQUIDITY BET
          if((e.target.parentElement.previousElementSibling.children[0].currentSrc == 'https://smarkets.com/static/img/price-dark-green-no-flash.png') && (e.target.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.children[0].children[0].children[1].innerText.split('\n')[0] == RUNNER)) {
            betType = 'b0';
            liquidity = e.target.innerText;
            odds = e.target.parentElement.previousElementSibling.children[1].innerText;
          } else if((e.target.parentElement.parentElement.previousElementSibling.children[0].children[0].currentSrc == 'https://smarkets.com/static/img/price-dark-green-no-flash.png') && (e.target.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.children[0].children[0].children[1].innerText.split('\n')[0] == RUNNER)) {
            betType = 'b1';
            liquidity = e.target.innerText;
            odds = e.target.parentElement.previousElementSibling.children[1].innerText;
          } else if((e.target.parentElement.parentElement.previousElementSibling.previousElementSibling.children[0].children[0].currentSrc == 'https://smarkets.com/static/img/price-dark-green-no-flash.png') && (e.target.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.children[0].children[0].children[1].innerText.split('\n')[0] == RUNNER)) {
            betType = 'b2';
            liquidity = e.target.innerText;
            odds = e.target.parentElement.previousElementSibling.children[1].innerText;
          }
        } else if(e.target.parentElement.parentElement.parentElement.className == 'prices bids') {// LIQUIDITY LAY
          if((e.target.parentElement.previousElementSibling.children[0].currentSrc == 'https://smarkets.com/static/img/price-dark-blue-no-flash.png') && (e.target.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.children[0].children[0].children[1].innerText.split('\n')[0] == RUNNER)) {
            betType = 'l0';
            liquidity = e.target.innerText;
            odds = e.target.parentElement.previousElementSibling.children[1].innerText;
          } else if((e.target.parentElement.parentElement.previousElementSibling.children[0].children[0].currentSrc == 'https://smarkets.com/static/img/price-dark-blue-no-flash.png') && (e.target.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.children[0].children[0].children[1].innerText.split('\n')[0] == RUNNER)) {
            betType = 'l1';
            liquidity = e.target.innerText;
            odds = e.target.parentElement.previousElementSibling.children[1].innerText;
          } else if((e.target.parentElement.parentElement.previousElementSibling.previousElementSibling.children[0].children[0].currentSrc == 'https://smarkets.com/static/img/price-dark-blue-no-flash.png') && (e.target.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.children[0].children[0].children[1].innerText.split('\n')[0] == RUNNER)) {
            betType = 'l2';
            liquidity = e.target.innerText;
            odds = e.target.parentElement.previousElementSibling.children[1].innerText;
          }
        }
        if(!!betType && !!odds && !!liquidity) {
          const timestamp = Date.now();
          const data = {
            betType,
            odds,
            liquidity,
            timestamp
          };
          const output = JSON.stringify(data);
          console.log(output);
        }
      }
    );
  }, RUNNER);
}

// execute scraper
bot()
  .catch(err => console.error(err));
//=============================================================================
