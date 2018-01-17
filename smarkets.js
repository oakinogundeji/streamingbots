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
  BOT_PARAMS = JSON.parse(process.argv[2]),
  EMAIL = BOT_PARAMS.EMAIL,
  PWD = BOT_PARAMS.PWD,
  ACCESS_LOGIN_SELECTOR = '#right-nav-section-login > div.right-nav-section-content > a:nth-child(2)',
  EMAIL_SELECTOR = '#login-form-email',
  PWD_SELECTOR = '#login-form-password',
  SIGN_BTN_SELECTOR = '#login-page > div.form-page-content > form > button',
  RACE_URL = BOT_PARAMS.URL,
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
  /*// navigate to smarkets homepage
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
  await page.click(SIGN_BTN_SELECTOR);*/
  // navigate to RACE_URL
  await page.goto(RACE_URL, {
    waitUntil: 'networkidle0'
  });
  // ensure race container selector available
  //console.log(`${RACES_CONTAINER_SELECTOR}`);
  await page.waitForSelector(RACES_CONTAINER_SELECTOR);
  //console.log('RACES_CONTAINER_SELECTOR found, continuing...');
  // allow 'page' instance to output any calls to browser log to node log
  page.on('console', data => console.log(data.text()));
  // bind to races container and lsiten for updates to odds, bets etc
  await page.$eval(RACES_CONTAINER_SELECTOR,
    target => {
      target.addEventListener('DOMSubtreeModified', function (e) {
        // define variables
        let
          betType,
          oddsType,
          priceType,
          oddsValue,
          priceValue,
          horseName;
        // check if event from odds or price matched cols
        if(e.target.parentElement.parentElement.parentElement.parentElement.className == 'prices offers') {// ODDS BACK
          betType = 'bet';
          if(e.target.parentElement.parentElement.children[0].currentSrc == 'https://smarkets.com/static/img/price-dark-green-no-flash.png') {
            oddsType = 'bet-0';
            priceType = 'bet-price-0';
            oddsValue = e.target.innerText;
            horseName = e.target.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.children[0].children[0].children[1].innerText.split('\n')[0];
          } else if(e.target.parentElement.parentElement.parentElement.previousElementSibling.children[0].children[0].currentSrc == 'https://smarkets.com/static/img/price-dark-green-no-flash.png') {
            oddsType = 'bet-1';
            priceType = 'bet-price-1';
            oddsValue = e.target.innerText;
            horseName = e.target.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.children[0].children[0].children[1].innerText.split('\n')[0];
          } else if(e.target.parentElement.parentElement.parentElement.previousElementSibling.previousElementSibling.children[0].children[0].currentSrc == 'https://smarkets.com/static/img/price-dark-green-no-flash.png') {
            oddsType = 'bet-2';
            priceType = 'bet-price-2';
            oddsValue = e.target.innerText;
            horseName = e.target.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.children[0].children[0].children[1].innerText.split('\n')[0];
          }
        } else if(e.target.parentElement.parentElement.parentElement.parentElement.className == 'prices bids') {// ODDS LAY
          betType = 'lay';
          if(e.target.parentElement.parentElement.children[0].currentSrc == 'https://smarkets.com/static/img/price-dark-blue-no-flash.png') {
            oddsType = 'lay-0';
            priceType = 'lay-price-0';
            oddsValue = e.target.innerText;
            horseName = e.target.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.children[0].children[0].children[1].innerText.split('\n')[0];
          } else if(e.target.parentElement.parentElement.parentElement.previousElementSibling.children[0].children[0].currentSrc == 'https://smarkets.com/static/img/price-dark-blue-no-flash.png') {
            oddsType = 'lay-1';
            priceType = 'lay-price-1';
            oddsValue = e.target.innerText;
            horseName = e.target.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.children[0].children[0].children[1].innerText.split('\n')[0];
          } else if(e.target.parentElement.parentElement.parentElement.previousElementSibling.previousElementSibling.children[0].children[0].currentSrc == 'https://smarkets.com/static/img/price-dark-blue-no-flash.png') {
            oddsType = 'lay-2';
            priceType = 'lay-price-2';
            oddsValue = e.target.innerText;
            horseName = e.target.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.children[0].children[0].children[1].innerText.split('\n')[0];
          }
        } else if(e.target.parentElement.parentElement.parentElement.className == 'prices offers') {
          betType = 'bet';
          if(e.target.parentElement.previousElementSibling.children[0].currentSrc == 'https://smarkets.com/static/img/price-dark-green-no-flash.png') {
            priceType = 'bet-price-0';
            oddsType = 'bet-0';
            priceValue = e.target.innerText;
            oddsValue = e.target.parentElement.previousElementSibling.children[1].innerText;
            horseName = e.target.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.children[0].children[0].children[1].innerText.split('\n')[0];
          } else if(e.target.parentElement.parentElement.previousElementSibling.children[0].children[0].currentSrc == 'https://smarkets.com/static/img/price-dark-green-no-flash.png') {
            priceType = 'bet-price-1';
            oddsType = 'bet-1';
            priceValue = e.target.innerText;
            oddsValue = e.target.parentElement.previousElementSibling.children[1].innerText;
            horseName = e.target.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.children[0].children[0].children[1].innerText.split('\n')[0];
          } else if(e.target.parentElement.parentElement.previousElementSibling.previousElementSibling.children[0].children[0].currentSrc == 'https://smarkets.com/static/img/price-dark-green-no-flash.png') {
            priceType = 'bet-price-2';
            oddsType = 'bet-2';
            priceValue = e.target.innerText;
            oddsValue = e.target.parentElement.previousElementSibling.children[1].innerText;
            horseName = e.target.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.children[0].children[0].children[1].innerText.split('\n')[0];
          }
        } else if(e.target.parentElement.parentElement.parentElement.className == 'prices bids') {
          betType = 'lay';
          if(e.target.parentElement.previousElementSibling.children[0].currentSrc == 'https://smarkets.com/static/img/price-dark-blue-no-flash.png') {
            priceType = 'lay-price-0';
            oddsType = 'lay-0';
            priceValue = e.target.innerText;
            oddsValue = e.target.parentElement.previousElementSibling.children[1].innerText;
            horseName = e.target.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.children[0].children[0].children[1].innerText.split('\n')[0];
          } else if(e.target.parentElement.parentElement.previousElementSibling.children[0].children[0].currentSrc == 'https://smarkets.com/static/img/price-dark-blue-no-flash.png') {
            priceType = 'lay-price-1';
            oddsType = 'lay-1';
            priceValue = e.target.innerText;
            oddsValue = e.target.parentElement.previousElementSibling.children[1].innerText;
            horseName = e.target.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.children[0].children[0].children[1].innerText.split('\n')[0];
          } else if(e.target.parentElement.parentElement.previousElementSibling.previousElementSibling.children[0].children[0].currentSrc == 'https://smarkets.com/static/img/price-dark-blue-no-flash.png') {
            priceType = 'lay-price-2';
            oddsType = 'lay-2';
            priceValue = e.target.innerText;
            oddsValue = e.target.parentElement.previousElementSibling.children[1].innerText;
            horseName = e.target.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.children[0].children[0].children[1].innerText.split('\n')[0];
          }
        }
        if(!!betType && !!oddsType && !!priceType && !!oddsValue && !!priceValue && !!horseName) {
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
    );
  });
}

// execute scraper
bot()
  .catch(err => console.error(err));
//=============================================================================
