'use strict';
if(process.env.NODE_ENV != 'production') {
  require('dotenv').config();
}
//=============================================================================
// dependencies
const
  {spawn} = require('child_process'),
  MongoClient = require('mongodb').MongoClient,
  RACE_LABEL = process.env.RACE_LABEL,
  DBURL = process.env.DBURL,
  DB = DBURL.split('/')[3],
  EMAIL = process.env.EMAIL,
  BETFAIR_PWD = process.env.BETFAIR_PWD,
  SMARKETS_PWD = process.env.SMARKETS_PWD,
  BETFAIR_URL = process.env.BETFAIR_URL,
  SMARKETS_URL = process.env.SMARKETS_URL,
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
// helper functions

function spawnBots() {
  // spawn the BOTS

  const
    BETFAIR = spawn('node', ['./betfair.js', BETFAIR_ARGS]),
    SMARKETS = spawn('node', ['./smarkets.js', SMARKETS_ARGS]);

  // listen to data

  BETFAIR.stdout.on('data', data => {
    let dataObj = JSON.parse(data);
    dataObj.exchange = 'betfair';
    return console.log(dataObj);
  });
  BETFAIR.stderr.on('error', err => console.error(`BETFAIR err: ${err}`));
  BETFAIR.on('close', () => console.log('BETFAIR BOT closed...'));

  SMARKETS.stdout.on('data', data => {
    let dataObj = JSON.parse(data);
    dataObj.exchange = 'smarkets';
    return console.log(dataObj);
  });
  SMARKETS.stderr.on('error', err => console.error(`SMARKETS err: ${err}`));
  SMARKETS.on('close', () => console.log('SMARKETS BOT closed...'));
}

async function saveData(DB_CONN, data) {
  return null;
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
  .then(async (db) => {
    // create initial race card
    console.log(`RACE_LABEL: ${RACE_LABEL}`);

    DB_CONN = db;

    let raceDoc = {
      raceLabel: RACE_LABEL,
      runners: {},
      winner: ''
    };

    let row = await DB_CONN.collection('races').insertOne(raceDoc);

    if(row.result.ok) {
      console.log('race object created...');
      return Promise.resolve(true);
    } else {
      const newErr = new Error('Race boject NOT created');
      return Promise.reject(newErr.msg);
    }
  })
  .then(ok => {
    console.log('all good...');
    console.log('spawning streaming bots...');
    return spawnBots();
  })
  .catch(err => console.error(err))

// handle SIGINT
process.on('SIGINT', () => process.exit(0));
