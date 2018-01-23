'use strict';
//=============================================================================
module.exports = function (RUNNER, DB_CONN) {
  const
    {spawn} = require('child_process'),
    Promise = require('bluebird');

  // helper functions

  function spawnBots(RUNNER) {
    // spawn the BOTS
    console.log(`spawning 2 bots for ${RUNNER}`);

  const
    BETFAIR = spawn('node', ['./betfair.js', RUNNER]),
    SMARKETS = spawn('node', ['./smarkets.js', RUNNER]);

      // listen for data

    BETFAIR.stdout.on('data', data => {
      console.log(`data from betfair bot for ${RUNNER}`);
      return console.log(data.toString());
      //return saveData(DB_CONN, 'betfair', RUNNER, data);
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
      return console.log(data.toString());
      //return saveData(DB_CONN, 'smarkets', RUNNER, data);
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

  return spawnBots(RUNNER);
};
