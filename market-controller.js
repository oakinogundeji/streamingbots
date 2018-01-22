'use strict';
//=============================================================================
// dependencies

const
  {spawn} = require('child_process'),
  Promise = require('bluebird'),
  MongoClient = require('mongodb').MongoClient,
  /*CONTROLLER_PARAMS = JSON.parse(process.argv[2]),
  DBURL = CONTROLLER_PARAMS.dburl,
  DB = CONTROLLER_PARAMS.db,
  RUNNER = CONTROLLER_PARAMS.runner,
  BETFAIR_ARGS = CONTROLLER_PARAMS.betfair,
  SMARKETS_ARGS = CONTROLLER_PARAMS.smarkets;*/
  DBURL = process.env.dburl,
  DB = process.env.db,
  RUNNER = process.env.runner,
  BETFAIR_ARGS = process.env.betfair,
  SMARKETS_ARGS = process.env.smarkets


// helper functions

function spawnBots() {
  // spawn the BOTS
  console.log(`spawning 2 bots for ${RUNNER}`);
  /*const
    B_ARGS = JSON.parse(BETFAIR_ARGS),
    S_ARGS = JSON.parse(BETFAIR_ARGS);
  B_ARGS.RUNNER = RUNNER;
  S_ARGS.RUNNER = RUNNER;*/

  /*const
    BETFAIR_ARGS_JSON = JSON.stringify(BETFAIR_ARGS),
    SMARKETS_ARGS_JSON = JSON.stringify(SMARKETS_ARGS);*/

  const
    BETFAIR = spawn('node', ['./betfair.js'], {env: BETFAIR_ARGS}),
    SMARKETS = spawn('node', ['./smarkets.js'], {env: SMARKETS_ARGS});

  // listen to data from streaming BOTs

  BETFAIR.stdout.on('data', data => {
    console.log(`data from betfair bot for ${RUNNER}`);
    return console.log(data.toSring());
    //return saveData(DB_CONN, 'betfair', RUNNER, data);
  });
  BETFAIR.stderr.on('data', err => {
    console.error(`BETFAIR err:`);
    return console.error(err.toString());
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
    return console.log(data.toSring());
    //return saveData(DB_CONN, 'smarkets', RUNNER, data);
  });
  SMARKETS.stderr.on('data', err => {
    console.error(`SMARKETS err:`);
    return console.error(err.toString());
  });
  SMARKETS.on('close', code => {
    if(code < 1) {
      return console.log(`SMARKETS BOT for ${RUNNER} closed normally...`);
    } else {
      return console.error(`SMARKETS BOT for ${RUNNER} closed abnormally...`);
    }
  });
}

async function saveData(DB_CONN, exchange, RUNNER, data) {

  // check which exchange is reporting the data
  if(exchange == 'betfair') {
    return saveBetfairData(DB_CONN, RUNNER, data);
  } else if(exchange == 'smarkets') {
    return saveSmarketsData(DB_CONN, RUNNER, data);
  }
}

async function saveBetfairData(DB_CONN, RUNNER, data) {
  // extract horseName
  const nestedField = 'runners.' + RUNNER + '.betfair';
  // push data obj into 'betfair' array
  const addNewData = await DB_CONN.collection('races').findOneAndUpdate({
    raceLabel: RACE_LABEL}, {$push: {
      [nestedField]: data
    }});
  if(addNewData.ok) {
    console.log('addNewData betfair...');
    return Promise.resolve(true);
  } else {
    const newErr = new Error(`failed to update ${RUNNER}`);
    return Promise.reject(newErr);
  }
}

async function saveSmarketsData(DB_CONN, RUNNER, data) {
  // extract horseName
  const nestedField = 'runners.' + RUNNER + '.smarkets';
  // push data obj into 'betfair' array
  const addNewData = await DB_CONN.collection('races').findOneAndUpdate({
    raceLabel: RACE_LABEL}, {$push: {
      [nestedField]: data
    }});
  if(addNewData.ok) {
    console.log('addNewData smarkets...');
    return Promise.resolve(true);
  } else {
    const newErr = new Error(`failed to update ${RUNNER}`);
    return Promise.reject(newErr);
  }
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
    console.log('all good...');
    console.log('spawning streaming bots...');
    // spawn 2 bots for the runner
    return spawnBots(RUNNER);
  })
  .catch(err => console.error(err))

// handle SIGINT
process.on('SIGINT', () => process.exit(0));
