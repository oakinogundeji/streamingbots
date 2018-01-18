'use strict';
if(process.env.NODE_ENV != 'production') {
  require('dotenv').config();
}
//=============================================================================
// dependencies
const
  {spawn} = require('child_process'),
  P = require('puppeteer'),
  MongoClient = require('mongodb').MongoClient,
  DBURL = process.env.DBURL,
  DB = DBURL.split('/')[3],
  EMAIL = process.env.EMAIL,
  BETFAIR_PWD = process.env.BETFAIR_PWD,
  SMARKETS_PWD = process.env.SMARKETS_PWD,
  BETFAIR_URL = process.env.BETFAIR_URL,
  SMARKETS_URL = process.env.SMARKETS_URL,
  SMARKETS_RACES_CONTAINER_SELECTOR = 'ul.contracts',
  SMARKETS_RUNNERS_SELECTOR = 'div.contract-info.-horse-racing',
  SMARKETS_RACE_LABEL_SELECTOR = '#main-content > main > div > div.event-header.-horse-racing > div > div > div.content.-horse-racing > h1 > span',
  BETFAIR_ARGS = JSON.stringify({
    URL: BETFAIR_URL,
    EMAIL: EMAIL,
    PWD: BETFAIR_PWD
  }),
  SMARKETS_ARGS = JSON.stringify({
    URL: SMARKETS_URL,
    EMAIL: EMAIL,
    PWD: BETFAIR_PWD
  }) ;
let
  runnersList,
  RACE_LABEL;
// helper functions

async function getRunners() {
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
  await page.goto(SMARKETS_URL, {
    waitUntil: 'networkidle0'
  });
  // ensure race container selector available
  //console.log(`${RACES_CONTAINER_SELECTOR}`);
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
}

function spawnBots() {
  // spawn the BOTS

  const
    BETFAIR = spawn('node', ['./betfair.js', BETFAIR_ARGS]),
    SMARKETS = spawn('node', ['./smarkets.js', SMARKETS_ARGS]);

  // listen to data

  BETFAIR.stdout.on('data', data => {
    let dataObj = JSON.parse(data);
    return console.log(dataObj);
  });
  BETFAIR.stderr.on('error', err => console.error(`BETFAIR err: ${err}`));
  BETFAIR.on('close', () => console.log('BETFAIR BOT closed...'));

  SMARKETS.stdout.on('data', data => {
    let dataObj = JSON.parse(data);
    return console.log(dataObj);
  });
  SMARKETS.stderr.on('error', err => console.error(`SMARKETS err: ${err}`));
  SMARKETS.on('close', () => console.log('SMARKETS BOT closed...'));
}

/*async function saveData(DB_CONN, exchange, data) {

  // check which exchange is reporting the data
  if(exchange == 'betfair') {
    return saveBetfairData(DB_CONN, exchange, data);
  } else if(exchange == 'smarkets') {
    return saveSmarketsData(DB_CONN, exchange, data);
  }
}

async function saveBetfairData(DB_CONN, exchange, data) {
  // check if runner exists in race card
  let Racecard = await DB_CONN.collection('races').findOne({
    raceLabel: RACE_LABEL
  });
  console.log('Racecard data...');
  if(Racecard.raceLabel == RACE_LABEL) {
    const runner = data.horseName;
    // raceCard doc found, check if field matching runner exists in
    // runners attrib
    if(runner in Racecard.runners) {
      // runner already exist add the data to it
      console.log(`${runner} already exists in raceCard`);
      const nestedField = 'runners.' + runner;
      console.log(`nestedField: ${nestedField}`);
      let addedNewData = await DB_CONN.collection('races').findOneAndUpdate({
        raceLabel: RACE_LABEL}, {$push: {
          nestedField: data
        }});
      console.log('addedNewData...');
      return console.log(addedNewData);
    } else {
      console.log(`${runner} does NOT exist in racecard`);
      // create new field on racecard.runners
      const nestedField = 'runners.' + runner;
      console.log(`nestedField: ${nestedField}`);
      let createdNewField = await DB_CONN.collection('races').findOneAndUpdate({
        raceLabel: RACE_LABEL}, {$set: {
          nestedField: []
        }});
      console.log(`createdNewField:`);
      return console.log(createdNewField);
    }
    return console.log('Racecard found...');
  } else {
    return console.error('Racecard NOT found...');
  }
}

async function saveSmarketsData(DB_CONN, exchange, data) {}*/
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
  .then(async (db) => {
    // create initial race card
    console.log(`RACE_LABEL: ${RACE_LABEL}`);

    DB_CONN = db;

    let raceDoc = {
      raceLabel: RACE_LABEL,
      runners: {},
      winner: ''
    };

    // confirm that raceCard does not yet exist on dBase
    let alreadyExists = await DB_CONN.collection('races').findOne(raceDoc);

    if(!alreadyExists) {
      let row = await DB_CONN.collection('races').insertOne(raceDoc);

      if(row.result.ok) {
        console.log('race object created...');
        return Promise.resolve(true);
      } else {
        const newErr = new Error('Race boject NOT created');
        return Promise.reject(newErr.msg);
      }
    } else {
      console.log('race object already exists...');
      return Promise.resolve(true);
    }
  })
  .then(ok => {
    console.log('all good...');

    //console.log('spawning streaming bots...');
    console.log('getting runners...');
    return getRunners()
    //return spawnBots();
  })
  .then(ok => {
    console.log('runnersList...');
    console.log(runnersList);
  })
  .catch(err => console.error(err))

// handle SIGINT
process.on('SIGINT', () => process.exit(0));
