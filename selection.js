'use strict';
if(process.env.NODE_ENV != 'production') {
  require('dotenv').config();
}
//=============================================================================
const
  {spawn} = require('child_process'),
  P = require('puppeteer'),
  Promise = require('bluebird'),
  SELECTION = process.argv[2],
  eventIdentifiers = JSON.parse(process.argv[3]),
  EVENT_LABEL = eventIdentifiers.eventLabel,
  COLLECTION = eventIdentifiers.collectionName,
  EVENT_DATE = eventIdentifiers.eventDate,
  MongoClient = require('mongodb').MongoClient,
  DBURL = process.env.DBURL,
  DB = DBURL.split('/')[3],
  BETFAIR_URL = process.env.BETFAIR_URL,
  EVENT_END_URL = process.env.EVENT_END_URL,
  EVENT_LINKS_SELECTOR = 'a.race-link';

let arbTrigger = {
  betfair: {l0: null, liquidity: null},
  smarkets: {l0: null, liquidity: null}
};


// helper functions
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

async function createSelectionDeltaDoc() {
  let selectionDoc = {
    eventLabel: EVENT_LABEL,
    eventDate: EVENT_DATE,
    selection: SELECTION,
    flag: 'deltas',
    b: [],
    s: []
  };

  // confirm that selectionDoc does not yet exist on dBase
  let alreadyExists = await DB_CONN.collection(COLLECTION).findOne({eventLabel: EVENT_LABEL, eventDate: EVENT_DATE, selection: SELECTION, flag: 'deltas'});
  if(!alreadyExists) {
    let row = await DB_CONN.collection(COLLECTION).insertOne(selectionDoc);

    if(row.result.ok) {
      console.log(`selectionDoc created for ${SELECTION}...`);
      console.log(selectionDoc);
      return Promise.resolve(true);
    } else {
      const newErr = new Error(`selectionDoc NOT created for ${SELECTION}...`);
      return Promise.reject(newErr);
    }
  } else {
    console.log(`selectionDoc for ${SELECTION} already exists...`);
    return Promise.resolve(true);
  }
}

async function createSelectionArbsDoc() {
  let selectionArbsDoc = {
    eventLabel: EVENT_LABEL,
    eventDate: EVENT_DATE,
    selection: SELECTION,
    flag: 'arbs',
    arbs: []
  };

  // confirm that selectionDoc does not yet exist on dBase
  let alreadyExists = await DB_CONN.collection(COLLECTION).findOne({eventLabel: EVENT_LABEL, eventDate: EVENT_DATE, selection: SELECTION, flag: 'arbs'});
  if(!alreadyExists) {
    let row = await DB_CONN.collection(COLLECTION).insertOne(selectionArbsDoc);

    if(row.result.ok) {
      console.log(`selectionArbsDoc created for ${SELECTION}...`);
      console.log(selectionArbsDoc);
      return Promise.resolve(true);
    } else {
      const newErr = new Error(`selectionArbsDoc NOT created for ${SELECTION}...`);
      return Promise.reject(newErr);
    }
  } else {
    console.log(`selectionArbsDoc for ${SELECTION} already exists...`);
    return Promise.resolve(true);
  }
}

function spawnBots() {
  // spawn the BOTS
  console.log(`spawning 2 bots for ${SELECTION}`);
  spawnBetfairBot();
  spawnSmarketsBot();
  return true;
}

function spawnBetfairBot() {
  try {
    console.log(`Spawning Betfair BOT for ${SELECTION}`);
    const BETFAIR = spawn('node', ['./betfair.js', SELECTION]);

    // listen for data

    BETFAIR.stdout.on('data', data => {
      console.log(`data from betfair bot for ${SELECTION}`);
      const dataObj = JSON.parse(data.toString());
      console.log(dataObj);
      checkForArbs('betfair', dataObj);
      return saveData('betfair', dataObj);
    });

    BETFAIR.stderr.on('data', err => {
      console.error(`BETFAIR err for ${SELECTION}...`);
      console.error(err.toString());
      throw err.toString();
    });

    BETFAIR.on('error', err => {
      console.error(`BETFAIR CP err for ${SELECTION}...`);
      console.error(err);
      throw err;
    });

    BETFAIR.on('close', code => {
      if(code < 1) {
        return console.log(`BETFAIR BOT for ${SELECTION} closed normally...`);
      } else {
        return console.error(`BETFAIR BOT for ${SELECTION} closed abnormally...`);
      }
    });
  } catch(err) {
    console.error(err);
    console.log(`respawning Betfair BOT for ${SELECTION}`);
    return spawnBetfairBot();
  }
}

function spawnSmarketsBot() {
  try {
    console.log(`Spawning Smarkets BOT for ${SELECTION}`);
    const SMARKETS = spawn('node', ['./smarkets.js', SELECTION]);

    // listen for data

    SMARKETS.stdout.on('data', data => {
      console.log(`data from smarkets bot for ${SELECTION}`);
      const dataObj = JSON.parse(data.toString());
      console.log(dataObj);
      checkForArbs('smarkets', dataObj);
      return saveData('smarkets', dataObj);
    });

    SMARKETS.stderr.on('data', err => {
      console.error(`SMARKETS err for ${SELECTION}...`);
      console.error(err.toString());
      throw err.toString();
    });

    SMARKETS.on('error', err => {
      console.error(`SMARKETS CP err for ${SELECTION}...`);
      console.error(err);
      throw err;
    });

    SMARKETS.on('close', code => {
      if(code < 1) {
        return console.log(`SMARKETS BOT for ${SELECTION} closed normally...`);
      } else {
        return console.error(`SMARKETS BOT for ${SELECTION} closed abnormally...`);
      }
    });
  } catch(err) {
    console.error(err);
    console.log(`respawning Smarkets BOT for ${SELECTION}`);
    return spawnSmarketsBot();
  }
}

async function saveData(exchange, data) {

  // check which exchange is reporting the data
  if(exchange == 'betfair') {
    return saveBetfairData(data);
  } else if(exchange == 'smarkets') {
    return saveSmarketsData(data);
  }
}

async function saveBetfairData(data) {
  // push data obj into 'betfair' array
  const addNewData = await DB_CONN.collection(COLLECTION).findOneAndUpdate({eventLabel: EVENT_LABEL, eventDate: EVENT_DATE, selection: SELECTION, flag: 'deltas'}, {$push: {
      b: data
    }});
  if(addNewData.lastErrorObject.updatedExisting) {
    console.log(`added new betfair data for ${SELECTION}...`);
    return Promise.resolve(true);
  } else {
    const newErr = new Error(`failed to update betfair data for ${SELECTION}...`);
    return Promise.reject(newErr);
  }
}

async function saveSmarketsData(data) {
  // push data obj into 'smarkets' array
  const addNewData = await DB_CONN.collection(COLLECTION).findOneAndUpdate({eventLabel: EVENT_LABEL, eventDate: EVENT_DATE, selection: SELECTION, flag: 'deltas'}, {$push: {
      s: data
    }});
  if(addNewData.lastErrorObject.updatedExisting) {
    console.log(`added new smarkets data for ${SELECTION}...`);
    return Promise.resolve(true);
  } else {
    const newErr = new Error(`failed to update smarkets data for ${SELECTION}...`);
    return Promise.reject(newErr);
  }
}

function checkForArbs(exchange, data) {
  if((exchange == 'betfair') && ((data.betType == 'b0') || (data.betType == 'l0'))) {
    console.log('checkForArbs invoked...');
    console.log(arbTrigger);
    const odds = Number(data.odds);
    // process data
    // check if betType == 'l0'
    if(data.betType == 'l0') {
      arbTrigger.betfair.l0 = odds;
      return arbTrigger.betfair.liquidity = data.liquidity;
    } else {// check if arbTrigger vals have been initialized
      if(!arbTrigger.smarkets.l0) {
        return;
      }
      // check if arbs exists
      if(odds > arbTrigger.smarkets.l0) {// arbs exists
        console.log(`Arb exists for ${SELECTION}`);
        let
          betfairLiquidity = Number(data.liquidity.slice(1)),
          smarketsLiquidity = Number(arbTrigger.smarkets.liquidity.slice(1)),
          arbsLiquidity;
        if((betfairLiquidity > smarketsLiquidity ) && (smarketsLiquidity > 2)) {
          arbsLiquidity = arbTrigger.smarkets.liquidity;
          console.log(`smarketsLiquidity: ${smarketsLiquidity}, betfairLiquidity: ${betfairLiquidity}, arbsLiquidity: ${arbsLiquidity}`);
          console.log(arbTrigger);
        } else if((smarketsLiquidity > betfairLiquidity ) && (betfairLiquidity > 2)) {
          arbsLiquidity = data.liquidity;
          console.log(`smarketsLiquidity: ${smarketsLiquidity}, betfairLiquidity: ${betfairLiquidity}, arbsLiquidity: ${arbsLiquidity}`);
          console.log(arbTrigger);
        } else {
          arbsLiquidity = '£2';
          console.log(`smarketsLiquidity: ${smarketsLiquidity}, betfairLiquidity: ${betfairLiquidity}, arbsLiquidity: ${arbsLiquidity}`);
          console.log(arbTrigger);
        }
        const arbsData = {
          b0: odds,
          l0: arbTrigger.smarkets.l0,
          back: 'betfair',
          lay: 'smarkets',
          selection: SELECTION,
          liquidity: arbsLiquidity,
          timestamp: data.timestamp
        };
        console.log(arbsData);
        console.log('checkForArbs exit...');
        return saveArbs(arbsData);
      }
    }
  } else if((exchange == 'smarkets') && ((data.betType == 'b0') || (data.betType == 'l0'))) {
    console.log('checkForArbs invoked...');
    const odds = Number(data.odds);
    // process data
    // check if betType == 'l0'
    if(data.betType == 'l0') {
      arbTrigger.smarkets.l0 = odds;
      return arbTrigger.smarkets.liquidity = data.liquidity;
    } else {// check if arbTrigger vals have been initialized
      if(!arbTrigger.betfair.l0) {
        return;
      }
      // check if arbs exists
      if(odds > arbTrigger.betfair.l0) {// arbs exists
        console.log(`Arb exists for ${SELECTION}`);
        let
          smarketsLiquidity = Number(data.liquidity.slice(1)),
          betfairLiquidity = Number(arbTrigger.betfair.liquidity.slice(1)),
          arbsLiquidity;
        if((smarketsLiquidity > betfairLiquidity ) && (betfairLiquidity > 2)) {
          arbsLiquidity = arbTrigger.betfair.liquidity;
          console.log(`smarketsLiquidity: ${smarketsLiquidity}, betfairLiquidity: ${betfairLiquidity}, arbsLiquidity: ${arbsLiquidity}`);
          console.log(arbTrigger);
        } else if((betfairLiquidity > smarketsLiquidity ) && (smarketsLiquidity > 2)) {
          arbsLiquidity = data.liquidity;
          console.log(`smarketsLiquidity: ${smarketsLiquidity}, betfairLiquidity: ${betfairLiquidity}, arbsLiquidity: ${arbsLiquidity}`);
          console.log(arbTrigger);
        } else {
          arbsLiquidity = '£2';
          console.log(`smarketsLiquidity: ${smarketsLiquidity}, betfairLiquidity: ${betfairLiquidity}, arbsLiquidity: ${arbsLiquidity}`);
          console.log(arbTrigger);
        }
        const arbsData = {
          b0: odds,
          l0: arbTrigger.betfair.l0,
          back: 'smarkets',
          lay: 'betfair',
          selection: SELECTION,
          liquidity: arbsLiquidity,
          timestamp: data.timestamp
        };
        console.log(arbsData);
        return saveArbs(arbsData);
      }
    }
  }
}

async function saveArbs(data) {
  // push data obj into 'arbs' array
  const addNewData = await DB_CONN.collection(COLLECTION).findOneAndUpdate({eventLabel: EVENT_LABEL, eventDate: EVENT_DATE, selection: SELECTION, flag: 'arbs'}, {$push: {
      arbs: data
    }});
  if(addNewData.lastErrorObject.updatedExisting) {
    console.log('addNewData arbs...');
    return Promise.resolve(true);
  } else {
    const newErr = new Error(`failed to add arbs for ${SELECTION}`);
    return Promise.reject(newErr);
  }
}

async function listenForCloseEvent() {
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
  await page.goto(EVENT_END_URL, {
    waitUntil: 'networkidle2',
    timeout: 180000
  });
  // wait for 30 secs
  await page.waitFor(30*1000);
  // define checkEventEnd function
  async function checkEventEnd() {
    console.log('checkEventEnd invoked...');
    // get all events on page
    const events = await page.$$eval(EVENT_LINKS_SELECTOR, (events, BETFAIR_URL) => {
      console.log('querying for events...');
      const eventNotEnded = events.filter(event => event.href == BETFAIR_URL);
      console.log('eventNotEnded obj...');
      console.log(eventNotEnded);
      return eventNotEnded;
    }, BETFAIR_URL);
    if(events.length > 0) {// event has NOT ended
      console.log(`event has NOT ended for ${SELECTION}...`);
      return setTimeout(checkEventEnd, 300000);
    } else {
      console.log(`event has ended for ${SELECTION}...`);
      return process.exit(0);
    }
  }

  return checkEventEnd();
}

// execute

connectToDB()
  .then(async (client) => {
    console.log(`SELECTION for ${SELECTION} successfully connected to ${DBURL}`);
    console.log(`DB: ${DB}`);
    const db = client.db(DB);
    return db;
  })
  .then(db => {
    DB_CONN = db;
    return Promise.resolve(true);
  })
  .then(ok => createSelectionDeltaDoc())
  .then(ok => createSelectionArbsDoc())
  .then(ok => {
    console.log(`spawning streaming BOTs for ${SELECTION}...`);
    return spawnBots();
  })
  .then(ok => {
    console.log('ready to listen for event ended');
    return listenForCloseEvent();
  })/*
  .then(ok => {
    if(ok) {
      console.log('selection has ended...');
      return process.exit(0);
    }
  })*/
  .catch(err => console.error(err));
