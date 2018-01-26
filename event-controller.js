'use strict';
if(process.env.NODE_ENV != 'production') {
  require('dotenv').config();
}
//=============================================================================
// dependencies
const
  {fork} = require('child_process'),
  P = require('puppeteer'),
  Promise = require('bluebird'),
  MongoClient = require('mongodb').MongoClient,
  DBURL = process.env.DBURL,
  DB = DBURL.split('/')[3],
  SMARKETS_URL = process.env.SMARKETS_URL,
  SMARKETS_RACES_CONTAINER_SELECTOR = 'ul.contracts',
  SMARKETS_RUNNERS_SELECTOR = 'div.contract-info.-horse-racing',
  SMARKETS_RACE_LABEL_SELECTOR = '#main-content > main > div > div.event-header.-horse-racing > div > div > div.content.-horse-racing > h1 > span';
let
  runnersList,
  RACE_LABEL;
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
  // get list of horses
  runnersList = await page.$$eval(SMARKETS_RUNNERS_SELECTOR, targets => {
    let runnersList = [];
    targets.filter(target => {
      if(target.parentElement.nextElementSibling.children[0].className == 'price-section') {
        const runner = target.children[1].children[0].innerText;
        console.log(`runner info: ${runner}`);
        return runnersList.push(runner);
      }
    });
    return runnersList;
  });
  await browser.close();
  return Promise.resolve(true);
}

function forkSelection(RUNNER, RACE_LABEL) {
  console.log(`launching SELECTION for ${RUNNER}...`);
  return fork('./selection.js', [RUNNER, RACE_LABEL]);
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
    console.log('getting runners...');
    return getRunners();
  })
  .then(ok => {
    console.log('runnersList...');
    console.log(runnersList);
    return Promise.resolve(true);
  })
  .then(async (ok) => {
    // create initial race card
    let raceDoc = {
      raceLabel: RACE_LABEL,
      runners: {},
      winner: '',
      arbs: []
    };

    runnersList.forEach(runner => raceDoc.runners[runner] = {
      betfair: [],
      smarkets: []
    });

    console.log('final raceDoc..');

    console.log(raceDoc);

    // confirm that raceCard does not yet exist on dBase
    let alreadyExists = await DB_CONN.collection('races').findOne(raceDoc);

    if(!alreadyExists) {
      let row = await DB_CONN.collection('races').insertOne(raceDoc);

      if(row.result.ok) {
        console.log('race object created...');
        return Promise.resolve(true);
      } else {
        const newErr = new Error('Race object NOT created');
        return Promise.reject(newErr);
      }
    } else {
      console.log('race object already exists...');
      return Promise.resolve(true);
    }
  })
  .then(ok => {
    console.log('all good...');
    console.log('launching SELECTIONs...');
    // create 1 SELECTION per runner
    return forkSelection(runnersList[0], RACE_LABEL);
    //return runnersList.forEach(runner => forkSelection(runner, RACE_LABEL));
  })
  .catch(err => console.error(err));
