'use strict';
//=============================================================================
// dependencies
const {spawn} = require('child_process');

// spawn the BOTS

const
  BETFAIR = spawn('node', ['./betfair.js']),
  SMARKETS = spawn('node', ['./smarkets.js']);

// listen to data

BETFAIR.stdout.on('data', data => {
  let dataObj = JSON.parse(data);
  dataObj.exchange = 'betfair';
  return console.log(dataObj);
});
BETFAIR.stderr.on('error', err => console.error(`BETFAIR err: ${err}`));
BETFAIR.on('close', () => console.log('BETFAIR closed...'));

SMARKETS.stdout.on('data', data => {
  let dataObj = JSON.parse(data);
  dataObj.exchange = 'smarkets';
  return console.log(dataObj);
});
SMARKETS.stderr.on('error', err => console.error(`SMARKETS err: ${err}`));
SMARKETS.on('close', () => console.log('SMARKETS closed...'));
