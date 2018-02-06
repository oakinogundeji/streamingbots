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
  LOGIN_URL = 'https://www.betfair.com/sport',
  EMAIL = process.env.EMAIL,
  PWD = process.env.BETFAIR_PWD,
  EVENT_URL = process.env.BETFAIR_URL,
  SELECTION = process.argv[2],
  EMAIL_SELECTOR = '#login-dialog-username-input',
  PWD_SELECTOR = '#login-dialog-password-input',
  ACCESS_LOGIN_SELECTOR = '#betslip-container > div > div > div.pane.active > div > div > div > ng-include > ng-include:nth-child(1) > div.open-selection-text > p.selection-text.highlighted > span',
  LOGIN_BTN_SELECTOR = 'body > ng-on-http-stable > ng-transclude > div.login-dialog > div > div > div > div > section > form > div:nth-child(10) > input',
  SELECTIONS_CONTAINER_SELECTOR = 'div.main-mv-runners-list-wrapper';


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
  // navigate to EVENT_URL
  await page.goto(EVENT_URL, {
    waitUntil: 'networkidle2',
    timeout: 180000
  });
  await page.waitFor(10*1000);
  // ensure ACCESS_LOGIN_SELECTOR is available
  await page.waitForSelector(ACCESS_LOGIN_SELECTOR);
  // click ACCESS_LOGIN_SELECTOR button
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
  await page.click(LOGIN_BTN_SELECTOR);
  await page.waitFor(30*1000);
  // ensure race container selector available
  await page.waitForSelector(SELECTIONS_CONTAINER_SELECTOR, {
    timeout: 180000
  });
  // allow 'page' instance to output any calls to browser log to node log
  page.on('console', data => console.log(data.text()));
  // bind to races container and lsiten for updates to , bets etc
  await page.$eval(SELECTIONS_CONTAINER_SELECTOR,
    (target, SELECTION) => {
      target.addEventListener('DOMSubtreeModified', function (e) {
        // check for most common element of back and lay as source of event
        if(e.target.parentElement.parentElement.parentElement.parentElement.className == 'runner-line') {
          // define variables
          let
            betType,
            odds,
            liquidity;
          // check if delta is for runner
          if(e.target.parentElement.parentElement.parentElement.parentElement.children[0].children[0].children[1].children[0].children[0].children[0].children[2].innerText.split('\n')[0] == SELECTION) {
          // check if back or lay
          if(e.target.parentElement.parentElement.classList[0] == 'back') { // BACK
            if(e.target.parentElement.parentElement.className == 'back mv-bet-button back-button back-selection-button') {
              betType = 'b0';
              if(e.target.className == 'bet-button-price') {
                odds = e.target.innerText;
                liquidity = e.target.nextElementSibling.innerText;
              } else if(e.target.className == 'bet-button-size') {
                liquidity = e.target.innerText;
                odds = e.target.previousElementSibling.innerText;
              }
            } else if(e.target.parentElement.parentElement.parentElement.nextElementSibling.className == 'bet-buttons back-cell last-back-cell') {
              betType = 'b1';
              if(e.target.className == 'bet-button-price') {
                odds = e.target.innerText;
                liquidity = e.target.nextElementSibling.innerText;
              } else if(e.target.className == 'bet-button-size') {
                liquidity = e.target.innerText;
                odds = e.target.previousElementSibling.innerText;
              }
            } else if(e.target.parentElement.parentElement.parentElement.nextElementSibling.nextElementSibling.className == 'bet-buttons back-cell last-back-cell') {
               betType = 'b2';
              if(e.target.className == 'bet-button-price') {
                odds = e.target.innerText;
                liquidity = e.target.nextElementSibling.innerText;
              } else if(e.target.className == 'bet-button-size') {
                liquidity = e.target.innerText;
                odds = e.target.previousElementSibling.innerText;
              }
            }
          } else if(e.target.parentElement.parentElement.classList[0] == 'lay') { // LAY
            if(e.target.parentElement.parentElement.className == 'lay mv-bet-button lay-button lay-selection-button') {
              betType = 'l0';
              if(e.target.className == 'bet-button-price') {
                odds = e.target.innerText;
                liquidity = e.target.nextElementSibling.innerText;
              } else if(e.target.className == 'bet-button-size') {
                liquidity = e.target.innerText;
                odds = e.target.previousElementSibling.innerText;
              }
            } else if(e.target.parentElement.parentElement.parentElement.previousElementSibling.className == 'bet-buttons lay-cell first-lay-cell') {
              betType = 'l1';
              if(e.target.className == 'bet-button-price') {
                odds = e.target.innerText;
                liquidity = e.target.nextElementSibling.innerText;
              } else if(e.target.className == 'bet-button-size') {
                liquidity = e.target.innerText;
                odds = e.target.previousElementSibling.innerText;
              }
            } else if(e.target.parentElement.parentElement.parentElement.previousElementSibling.previousElementSibling.className == 'bet-buttons lay-cell first-lay-cell') {
              betType = 'l2';
              if(e.target.className == 'bet-button-price') {
                odds = e.target.innerText;
                liquidity = e.target.nextElementSibling.innerText;
              } else if(e.target.className == 'bet-button-size') {
                liquidity = e.target.innerText;
                odds = e.target.previousElementSibling.innerText;
              }
            }
          }}
          if(!!betType && !!odds && !!liquidity) {
            let timestamp = new Date();
            timestamp = timestamp.toISOString();
            const data = {
              betType,
              odds,
              liquidity: Number(liquidity.slice(1)),
              timestampFrom: timestamp,
              timestampTo: null
            };
            const output = JSON.stringify(data);
            console.log(output);
          }
        }
      }
    );
  }, SELECTION);
}

// execute scraper
bot()
  .catch(err => console.error(err));
//=============================================================================
