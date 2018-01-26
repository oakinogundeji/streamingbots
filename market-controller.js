'use strict';
//=============================================================================
module.exports = function (RUNNER, DB_CONN, RACE_LABEL) {
  const
    {spawn} = require('child_process'),
    Promise = require('bluebird');

  let arbTrigger = {
    betfair: {l0: null, liquidity: null},
    smarkets: {l0: null, liquidity: null}
  };

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
      const dataObj = JSON.parse(data.toString());
      console.log(dataObj);
      checkForArbs('betfair', dataObj);
      return saveData(DB_CONN, 'betfair', RUNNER, dataObj);
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
      return saveData(DB_CONN, 'smarkets', RUNNER, dataObj);
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
          const arbsData = {
            b0: odds,
            l0: arbTrigger.smarkets.l0,
            back: 'betfair',
            lay: 'smarkets',
            runner: RUNNER,
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
          const arbsData = {
            b0: odds,
            l0: arbTrigger.betfair.l0,
            back: 'smarkets',
            lay: 'betfair',
            runner: RUNNER,
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
    const addNewData = await DB_CONN.collection('races').findOneAndUpdate({
      raceLabel: RACE_LABEL}, {$push: {
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

  return spawnBots(RUNNER);
};
