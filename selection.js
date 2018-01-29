'use strict';
if(process.env.NODE_ENV != 'production') {
  require('dotenv').config();
}
//=============================================================================
const
  {spawn} = require('child_process'),
  Promise = require('bluebird'),
  RUNNER = process.argv[2],
  RACE_LABEL = process.argv[3],
  MongoClient = require('mongodb').MongoClient,
  DBURL = process.env.DBURL,
  DB = DBURL.split('/')[3];

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

async function createSelectionDoc() {
  let selectionDoc = {
    eventLabel: RACE_LABEL,
    selection: RUNNER,
    win: false,
    b: [],
    s: [],
    arbs: []
  };

  // confirm that selectionDoc does not yet exist on dBase
  let alreadyExists = await DB_CONN.collection('races').findOne({eventLabel: RACE_LABEL, selection: RUNNER});
  if(!alreadyExists) {
    let row = await DB_CONN.collection('races').insertOne(selectionDoc);

    if(row.result.ok) {
      console.log(`selectionDoc created for ${RUNNER}...`);
      console.log(selectionDoc);
      return Promise.resolve(true);
    } else {
      const newErr = new Error(`selectionDoc NOT created for ${RUNNER}...`);
      return Promise.reject(newErr);
    }
  } else {
    console.log(`selectionDoc for ${RUNNER} already exists...`);
    return Promise.resolve(true);
  }
}

function spawnBots() {
  // spawn the BOTS
  console.log(`spawning 2 bots for ${RUNNER}`);

const
  BETFAIR = spawn('node', ['./betfair.js', RUNNER]),
  SMARKETS = spawn('node', ['./smarkets.js', RUNNER]);

    // listen for data

  BETFAIR.stdout.on('data', data => {
    console.log(`data from betfair bot for ${RUNNER}`);
    const dataObj = JSON.parse(data.toString());
    console.log(dataObj);
    checkForArbs('betfair', dataObj);
    return saveData('betfair', dataObj);
  });
  BETFAIR.stderr.on('data', err => {
    console.error(`BETFAIR err for ${RUNNER}...`);
    return console.error(err.toString());
  });
  BETFAIR.on('error', err => {
    console.error(`BETFAIR CP err for ${RUNNER}...`);
    return console.error(err);
  });
  BETFAIR.on('close', code => {
    if(code < 1) {
      return console.log(`BETFAIR BOT for ${RUNNER} closed normally...`);
    } else {
      return console.error(`BETFAIR BOT for ${RUNNER} closed abnormally...`);
    }
  });

  SMARKETS.stdout.on('data', data => {
    console.log(`data from smarkets bot for ${RUNNER}`);
    const dataObj = JSON.parse(data.toString());
    console.log(dataObj);
    checkForArbs('smarkets', dataObj);
    return saveData('smarkets', dataObj);
  });
  SMARKETS.stderr.on('data', err => {
    console.error(`SMARKETS err for ${RUNNER}...`);
    return console.error(err.toString());
  });
  SMARKETS.on('error', err => {
    console.error(`SMARKETS CP err for ${RUNNER}...`);
    return console.error(err);
  });
  SMARKETS.on('close', code => {
    if(code < 1) {
      return console.log(`SMARKETS BOT for ${RUNNER} closed normally...`);
    } else {
      return console.error(`SMARKETS BOT for ${RUNNER} closed abnormally...`);
    }
  });
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
  const addNewData = await DB_CONN.collection('races').findOneAndUpdate({eventLabel: RACE_LABEL, selection: RUNNER}, {$push: {
      b: data
    }});
  if(addNewData.ok) {
    console.log(`added new betfair data for ${RUNNER}...`);
    return Promise.resolve(true);
  } else {
    const newErr = new Error(`failed to update betfair data for ${RUNNER}...`);
    return Promise.reject(newErr);
  }
}

async function saveSmarketsData(data) {
  // push data obj into 'smarkets' array
  const addNewData = await DB_CONN.collection('races').findOneAndUpdate({eventLabel: RACE_LABEL, selection: RUNNER}, {$push: {
      s: data
    }});
  if(addNewData.ok) {
    console.log(`added new smarkets data for ${RUNNER}...`);
    return Promise.resolve(true);
  } else {
    const newErr = new Error(`failed to update smarkets data for ${RUNNER}...`);
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
        console.log(`Arb exists for ${RUNNER}`);
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
        const arbsQuality = odds / arbTrigger.smarkets.l0;
        const arbsData = {
          b0: odds,
          l0: arbTrigger.smarkets.l0,
          back: 'betfair',
          lay: 'smarkets',
          selection: RUNNER,
          liquidity: arbsLiquidity,
          timestamp: data.timestamp,
          quality: arbsQuality
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
        console.log(`Arb exists for ${RUNNER}`);
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
        const arbsQuality = odds / arbTrigger.betfair.l0;
        const arbsData = {
          b0: odds,
          l0: arbTrigger.betfair.l0,
          back: 'smarkets',
          lay: 'betfair',
          selection: RUNNER,
          liquidity: arbsLiquidity,
          timestamp: data.timestamp,
          quality: arbsQuality
        };
        console.log(arbsData);
        return saveArbs(arbsData);
      }
    }
  }
}

async function saveArbs(data) {
  // push data obj into 'arbs' array
  const addNewData = await DB_CONN.collection('races').findOneAndUpdate({
    eventLabel: RACE_LABEL}, {$push: {
      arbs: data
    }});
  if(addNewData.ok) {
    console.log('addNewData arbs...');
    return Promise.resolve(true);
  } else {
    const newErr = new Error(`failed to add arbs for ${RUNNER}`);
    return Promise.reject(newErr);
  }
}

// execute

connectToDB()
  .then(async (client) => {
    console.log(`SELECTION for ${RUNNER} successfully connected to ${DBURL}`);
    console.log(`DB: ${DB}`);
    const db = client.db(DB);
    return db;
  })
  .then(db => {
    DB_CONN = db;
    return Promise.resolve(true);
  })
  .then(ok => {
    return createSelectionDoc();
  })
  .then(ok => {
    console.log(`spawning streaming BOTs for ${RUNNER}...`);
    return spawnBots();
  })
  .catch(err => console.error(err));
