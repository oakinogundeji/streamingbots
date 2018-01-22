'use strict';
if(process.env.NODE_ENV != 'production') {
  require('dotenv').config();
}
//=============================================================================
const
  {spawn} = require('child_process'),
  Promise = require('bluebird'),
  RUNNER = process.argv[2],
  EMAIL = process.env.EMAIL,
  BETFAIR_PWD = process.env.BETFAIR_PWD,
  SMARKETS_PWD = process.env.SMARKETS_PWD,
  BETFAIR_URL = process.env.BETFAIR_URL,
  SMARKETS_URL = process.env.SMARKETS_URL;


// helper functions

function spawnBots(RUNNER) {
  console.log(`creating market controller for ${RUNNER}`);
  // setup
  const
    B_ARGS = {
      URL: BETFAIR_URL,
      EMAIL: EMAIL,
      PWD: BETFAIR_PWD,
      RUNNER: RUNNER
    },
    S_ARGS = {
      URL: SMARKETS_URL,
      EMAIL: EMAIL,
      PWD: SMARKETS_PWD,
      RUNNER: RUNNER
    };

  // spawn the BOTS
  console.log(`spawning 2 bots for ${RUNNER}`);

  /*const
    BETFAIR = spawn('node', ['./betfair.js'], {env: B_ARGS}),
    SMARKETS = spawn('node', ['./smarkets.js'], {env: S_ARGS});

  // listen to data from streaming BOTs

  BETFAIR.stdout.on('data', data => {
    console.log(`data from betfair bot for ${RUNNER}`);
    return console.log(data);
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
    return console.log(data);
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
  });*/

  const
    BETFAIR = spawn('node', ['./betfair.js'], {
      env: B_ARGS,
      stdio: ['pipe', 'ipc', 'pipe']
    }),
    SMARKETS = spawn('node', ['./smarkets.js'], {
      env: S_ARGS,
      stdio: ['pipe', 'ipc', 'pipe']
    });

    // listen for data

  BETFAIR.on('message', data => {
    console.log(`data from betfair bot for ${RUNNER}`);
    return console.log(data.msg);
  });
  BETFAIR.stderr.on('data', err => {
    console.error(`BETFAIR err:`);
    return console.error(err.toString());
  });
  BETFAIR.on('error', err => {
    console.error(`BETFAIR err:`);
    return console.error(err);
  });
  BETFAIR.on('close', code => {
    if(code < 1) {
      return console.log(`BETFAIR BOT for ${RUNNER} closed normally...`);
    } else {
      return console.error(`BETFAIR BOT for ${RUNNER} closed abnormally...`);
    }
  });

  SMARKETS.on('message', data => {
    console.log(`data from smarkets bot for ${RUNNER}`);
    return console.log(data.msg);
    SMARKETS.stderr.on('data', err => {
      console.error(`SMARKETS err:`);
      return console.error(err.toString());
    });
  });
  SMARKETS.on('error', err => {
    console.error(`SMARKETS err:`);
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

spawnBots(RUNNER);
