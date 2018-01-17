'use strict';
if(process.env.NODE_ENV != 'production') {
  require('dotenv').config();
}
//=============================================================================
// dependencies
const
  {spawn} = require('child_process'),
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
BETFAIR.on('close', () => console.log('BETFAIR closed...'));

SMARKETS.stdout.on('data', data => {
  let dataObj = JSON.parse(data);
  dataObj.exchange = 'smarkets';
  return console.log(dataObj);
});
SMARKETS.stderr.on('error', err => console.error(`SMARKETS err: ${err}`));
SMARKETS.on('close', () => console.log('SMARKETS closed...'));
