'use strict';
//=============================================================================
// dependencies
const {spawn} = require('child_process');

// spawn the BOTS

const
  BETFAIR = spawn('node', ['./betfair.js']),
  SMARKETS = spawn('node', ['./smarkets.js']);

// listen to data

BETFAIR.stdout.on('data', data => console.log(`BETFAIR: ${data}`));
BETFAIR.stderr.on('error', err => console.error(`BETFAIR err: ${err}`));
BETFAIR.on('close', () => console.log('BETFAIR closed...'));

SMARKETS.stdout.on('data', data => console.log(`SMARKETS: ${data}`));
SMARKETS.stderr.on('error', err => console.error(`SMARKETS err: ${err}`));
SMARKETS.on('close', () => console.log('SMARKETS closed...'));
