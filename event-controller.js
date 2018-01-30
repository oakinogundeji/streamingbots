'use strict';
if(process.env.NODE_ENV != 'production') {
  require('dotenv').config();
}
//=============================================================================
// dependencies
const
  {fork} = require('child_process'),
  crypto = require('crypto'),
  P = require('puppeteer'),
  Promise = require('bluebird'),
  MongoClient = require('mongodb').MongoClient,
  DBURL = process.env.DBURL,
  DB = DBURL.split('/')[3],
  SMARKETS_URL = process.env.SMARKETS_URL,
  SMARKETS_RACES_CONTAINER_SELECTOR = 'ul.contracts',
  SMARKETS_RUNNERS_SELECTOR = 'div.contract-info.-horse-racing',
  SMARKETS_RACE_LABEL_SELECTOR = '#main-content > main > div > div.event-header.-horse-racing > div > div > div.content.-horse-racing > h1 > span',
  SMARKETS_TIME_LABEL_SELECTOR = '#main-content > main > div > div.event-header.-horse-racing > div > div > div.info.-upcoming > div.event-badges > span';
let
  selectionsList,
  RACE_LABEL,
  TIME_LABEL;
// helper functions

async function getRunners() {
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
  await page.goto(SMARKETS_URL, {
    waitUntil: 'networkidle0',
    timeout: 180000
  });
  // ensure race container selector available
  await page.waitForSelector(SMARKETS_RACES_CONTAINER_SELECTOR);
  // allow 'page' instance to output any calls to browser log to node log
  page.on('console', data => console.log(data.text()));
  console.log('SMARKETS_RACES_CONTAINER_SELECTOR found, continuing...');
  // get RACE_LABEL
  RACE_LABEL = await page.$eval(SMARKETS_RACE_LABEL_SELECTOR, target => target.innerText);
  console.log(`RACE_LABEL: ${RACE_LABEL}`);
  // get TIME_LABEL
  TIME_LABEL = await page.$eval(SMARKETS_TIME_LABEL_SELECTOR, target => target.innerText);
  console.log(`TIME_LABEL: ${TIME_LABEL}`);
  // get list of horses
  selectionsList = await page.$$eval(SMARKETS_RUNNERS_SELECTOR, targets => {
    let selectionsList = [];
    targets.filter(target => {
      if(target.parentElement.nextElementSibling.children[0].className == 'price-section') {
        const runner = target.children[1].children[0].innerText;
        console.log(`runner info: ${runner}`);
        return selectionsList.push(runner);
      }
    });
    return selectionsList;
  });
  await browser.close();
  return Promise.resolve(true);
}

function forkSelection(RUNNER, eventLabel) {
  console.log(`launching SELECTION for ${RUNNER}...`);
  return fork('./selection.js', [RUNNER, eventLabel]);
}

// connect to DBURL
let DB_CONN;

async function connectToDB () {
  let client;
  try {
    client = await MongoClient.connect(DBURL);
  } catch(err) {
    console.error(err);
    return process.exit(1);
  }
  if(client) {
    return client;
  }
}

connectToDB()
  .then(async (client) => {
    console.log(`Successfully connected to ${DBURL}`);
    console.log(`DB: ${DB}`);
    const db = client.db(DB);
    return db;
  })
  .then(db => {
    DB_CONN = db;
    return Promise.resolve(true);
  })
  .then(ok => {
    console.log('getting selections...');
    return getRunners();
  })
  .then(ok => {
    console.log('selectionsList...');
    console.log(selectionsList);
    return Promise.resolve(true);
  })
  .then(async (ok) => {

    // setup
    /*const eventLabel = crypto.createHash('md5').update(RACE_LABEL).digest('hex');*/
    let
      distanceIndex,
      padding;
    const venue = RACE_LABEL.split('/')[0].split('-')[1].trim();
    const timeString = TIME_LABEL.split('-')[0].trim();
    const timeStringLength = timeString.length;
    const raceDateTime = timeString.slice(0, timeStringLength - 3).trim();
    const raceDateTimeArr = raceDateTime.split(',');
    const raceTime = raceDateTimeArr.pop().trim();
    const eventLabel = venue +' - '+ raceTime;
    const raceDate = raceDateTimeArr.join(',');
    const distanceAndType = RACE_LABEL.split('/')[1].trim();
    if(distanceAndType.includes('yards')) {
      distanceIndex = distanceAndType.indexOf('yards');
      padding = 'yards'.length;
    } else if(distanceAndType.includes('furlongs')) {
      distanceIndex = distanceAndType.indexOf('furlongs');
      padding = 'furlongs'.length;
    } else {
      distanceIndex = distanceAndType.indexOf('miles');
      padding = 'miles'.length;
    }
    let raceType = distanceAndType.slice(distanceIndex + padding);
    raceType = raceType.trim();
    const distance = distanceAndType.slice(0, distanceIndex + padding);
    // create initial EVENT Card
    let eventCard = {
      eventLabel,
      venue,
      raceTime,
      raceDate,
      raceType,
      distance,
      country: 'GB',
      sport: 'HR',
      outcome: 'WIN'
    };
    console.log('eventCard');
    console.log(eventCard);

    // confirm that EVENT Card does not yet exist on dBase
    let alreadyExists = await DB_CONN.collection('HR').findOne({eventLabel: eventLabel, venue: venue, raceTime: raceTime, raceDate: raceDate});

    if(!alreadyExists) {
      let row = await DB_CONN.collection('HR').insertOne(eventCard);

      if(row.result.ok) {
        console.log('EVENT Card created...');
        return Promise.resolve(eventLabel);
      } else {
        const newErr = new Error('EVENT Card NOT created');
        return Promise.reject(newErr);
      }
    } else {
      console.log('EVENT Card already exists...');
      return Promise.resolve(eventLabel);
    }
  })
  .then(eventLabel => {
    console.log('all good...');
    return console.log('launching SELECTIONs...');
    // create 1 SELECTION per runner
    return forkSelection(selectionsList[0], eventLabel);
    //return selectionsList.forEach(runner => forkSelection(runner, eventLabel));
  })
  .catch(err => console.error(err));
