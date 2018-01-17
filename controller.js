'use strict';
//=============================================================================
// dependencies
const
  {spawn} = require('child_process'),
  BETFAIR_URL = 'https://www.betfair.com/exchange/plus/horse-racing/market/1.138963964',
  SMARKETS_URL = 'https://smarkets.com/event/888379/sport/horse-racing/lingfield/2018/01/17/12:10';

// spawn the BOTS

const
  BETFAIR = spawn('node', ['./betfair.js', BETFAIR_URL]),
  SMARKETS = spawn('node', ['./smarkets.js', SMARKETS_URL]);

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
