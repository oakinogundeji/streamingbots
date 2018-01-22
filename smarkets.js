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
  EMAIL = process.env.EMAIL,
  PWD = process.env.PWD,
  RUNNER = process.env.RUNNER,
  RACE_URL = process.env.URL,
  ACCESS_LOGIN_SELECTOR = '#right-nav-section-login > div.right-nav-section-content > a:nth-child(2)',
  EMAIL_SELECTOR = '#login-form-email',
  PWD_SELECTOR = '#login-form-password',
  SIGN_BTN_SELECTOR = '#login-page > div.form-page-content > form > button',
  RACES_CONTAINER_SELECTOR = 'ul.contracts';


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
  // navigate to smarkets homepage
  await page.goto(HOMEPAGE_URL, {
    waitUntil: 'networkidle0',
    timeout: 180000
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
  process.send({msg: `RUNNER: ${RUNNER}, PWD: ${PWD}, EMAIL: ${EMAIL}, RACE_URL: ${RACE_URL} from smarkets...`});
  /*//return console.log('filled creds from smarkets...');
  await page.waitFor(2*1000);
  // click login button
  await page.click(SIGN_BTN_SELECTOR);
  // navigate to RACE_URL
  await page.goto(RACE_URL, {
    waitUntil: 'networkidle0',
    timeout: 180000
  });
  // add tag for moment.js
  await page.addScriptTag({url: 'https://cdn.jsdelivr.net/npm/moment@2.20.1/moment.min.js'});
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
          const timestamp = moment().format('MMMM Do YYYY, h:mm:ss a');
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
  }, RUNNER);*/
}

// execute scraper
bot()
  .catch(err => console.error(err));
//=============================================================================
