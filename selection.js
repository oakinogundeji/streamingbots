'use strict';
if(process.env.NODE_ENV != 'production') {
  require('dotenv').config();
}
//=============================================================================
const
  {spawn} = require('child_process'),
  P = require('puppeteer'),
  Promise = require('bluebird'),
  mongoose = require('mongoose'),
  SelectionDocModel = require('./models/selection-docs'),
  SELECTION = process.argv[2],
  eventIdentifiers = JSON.parse(process.argv[3]),
  EVENT_LABEL = eventIdentifiers.eventLabel,
  TARGETS = eventIdentifiers.targets,
  DBURL = process.env.DBURL,
  BETFAIR_URL = process.env.BETFAIR_URL,
  EVENT_END_URL = process.env.EVENT_END_URL,
  HR_EVENT_LINKS_SELECTOR = 'a.race-link',
  GENERIC_EVENT_LINKS_SELECTOR = 'span.event-name',
  EMAIL = process.env.EMAIL,
  PWD = process.env.SMARKETS_PWD,
  EVENT_URL = process.env.SMARKETS_URL,
  ACCESS_LOGIN_SELECTOR = '#header-login',
  EMAIL_SELECTOR = '#login-form-email',
  PWD_SELECTOR = '#login-form-password',
  SHOW_PWD_SELECTOR = '#login-page > div.form-page-content > form > div:nth-child(2) > div > div > span.after > button',
  SIGNIN_BTN_SELECTOR = '#login-page > div.form-page-content > form > button';

/*let arbTrigger = {
  betfair: {l0: null, liquidity: null},
  smarkets: {l0: null, liquidity: null}
};*/

let
  betfairDeltas = {
    b0: null,
    b1: null,
    b2: null,
    l0: null,
    l1: null,
    l2: null,
    matchedAmount: null
  },
  smarketsDeltas = {
    b0: null,
    b1: null,
    b2: null,
    l0: null,
    l1: null,
    l2: null,
    matchedAmount: null
  };

let BETFAIR;
let SMARKETS;


// helper functions
// connect to DBURL
// connect to DBURL
let db;
const options = {
  promiseLibrary: Promise,
  reconnectTries: Number.MAX_VALUE,
  reconnectInterval: 500,
  poolSize: 10,
  socketTimeoutMS: 0,
  keepAlive: true
};

process.on('SIGINT', () => {
  mongoose.connection.close(() => {
    console.log('Selection dBase connection closed due to app termination');
    process.exit(0);
  });
});

function connectToDB() {
   return new Promise((resolve, reject) => {
     console.log(`Attempting to connect to ${DBURL}...`);
     mongoose.connect(DBURL, options);
     db = mongoose.connection;
     db.on('error', err => {
       console.error('There was a db connection error');
       return reject('There was an error connecting to mongodb')
     });
     db.once('connected', () => {
       console.info(`Selection successfully connected to ${DBURL}`);
       return resolve(true);
     });
     db.once('disconnected', () => {
       console.info('Selection successfully disconnected from ' + DBURL);
     });
   });
 }

async function createSelectionDeltaDoc() {
  let selectionDoc = {
    eventLabel: EVENT_LABEL,
    selection: SELECTION,
    b: [],
    s: []
  };

  // create selectionDoc for selection if NOT exists
  const query = SelectionDocModel.findOne({eventLabel: EVENT_LABEL, selection: SELECTION});
  const alreadyExists = await query.exec();
  if(!!alreadyExists && (alreadyExists.eventLabel == selectionDoc.eventLabel) && (alreadyExists.selection == selectionDoc.selection)) {
    console.log(`${alreadyExists.selection} for ${alreadyExists.eventLabel} already exists...`);
    console.log(alreadyExists);
    return Promise.resolve(true);
  } else {
    const newSelectionDoc = new SelectionDocModel(selectionDoc);
    const saveNewSelectionDoc = await newSelectionDoc.save();
    if((saveNewSelectionDoc.eventLabel == selectionDoc.eventLabel) && (saveNewSelectionDoc.selection == selectionDoc.selection)) {
      console.log(`successfully created selectionDoc for ${saveNewSelectionDoc.selection} on ${saveNewSelectionDoc.eventLabel}`);
      console.log(saveNewSelectionDoc);
      return Promise.resolve(true);
    } else {
      console.error(`failed to create selectionDoc for ${saveNewSelectionDoc.selection} on ${selectionDoc.eventLabel}`);
      const newErr = new Error(`failed to create selectionDoc for ${saveNewSelectionDoc.selection} on ${selectionDoc.eventLabel}`);
      return Promise.reject(newErr);
    }
  }
}

/*async function createSelectionArbsDoc() {
  let selectionArbsDoc = {
    eventLabel: EVENT_LABEL,
    selection: SELECTION,
    arbs: []
  };

  // confirm that selectionDoc does not yet exist on dBase
  let alreadyExists = await DB_CONN.collection(COLLECTION).findOne({eventLabel: EVENT_LABEL, selection: SELECTION});
  if(!alreadyExists) {
    let row = await DB_CONN.collection(COLLECTION).insertOne(selectionArbsDoc);

    if(row.result.ok) {
      console.log(`selectionArbsDoc created for ${SELECTION}...`);
      console.log(selectionArbsDoc);
      return Promise.resolve(true);
    } else {
      const newErr = new Error(`selectionArbsDoc NOT created for ${SELECTION}...`);
      return Promise.reject(newErr);
    }
  } else {
    console.log(`selectionArbsDoc for ${SELECTION} already exists...`);
    return Promise.resolve(true);
  }
}*/

function spawnBots() {
  // spawn the BOTS
  console.log(`spawning 2 bots for ${SELECTION}`);
  spawnBetfairBot();
  spawnSmarketsBot();
  return true;
}

function spawnBetfairBot() {
  if(SELECTION.toLowerCase() == 'draw') {
    SELECTION = 'The Draw';
  }
  console.log(`Spawning Betfair BOT for ${SELECTION}`);
  if(COLLECTION == 'horse-racing') {
    BETFAIR = spawn('node', ['./betfair-hr.js', SELECTION]);
  } else {
    BETFAIR = spawn('node', ['./betfair-generic.js', SELECTION]);
  }

  // listen for data

  BETFAIR.stdout.on('data', data => {
    try {
      console.log(`data from betfair bot for ${SELECTION}`);
      const dataObj = JSON.parse(data.toString());
      console.log(dataObj);
      //checkForArbs('betfair', dataObj);
      return saveData('betfair', dataObj);
    } catch(err) {
      console.error(err);
      console.log(`terminating existing Betfair BOT for ${SELECTION}`);
      process.kill(BETFAIR.pid);
      console.log(`respawning Betfair BOT for ${SELECTION}`);
      return spawnBetfairBot();
    }
  });

  BETFAIR.stderr.on('data', err => {
    console.error(`BETFAIR err for ${SELECTION}...`);
    console.error(err.toString());
    console.log(`terminating existing Betfair BOT for ${SELECTION}`);
    process.kill(BETFAIR.pid);
    console.log(`respawning Betfair BOT for ${SELECTION}`);
    return spawnBetfairBot();
  });

  BETFAIR.on('error', err => {
    console.error(`BETFAIR CP err for ${SELECTION}...`);
    console.error(err);
    console.log(`terminating existing Betfair BOT for ${SELECTION}`);
    process.kill(BETFAIR.pid);
    console.log(`respawning Betfair BOT for ${SELECTION}`);
    return spawnBetfairBot();
  });

  BETFAIR.on('close', code => {
    if(code < 1) {
      return console.log(`BETFAIR BOT for ${SELECTION} closed normally...`);
    } else {
      return console.error(`BETFAIR BOT for ${SELECTION} closed abnormally...`);
    }
  });
}

function spawnSmarketsBot() {
  console.log(`Spawning Smarkets BOT for ${SELECTION}`);
  if(COLLECTION == 'horse-racing') {
    SMARKETS = spawn('node', ['./smarkets-hr.js', SELECTION]);
  } else {
    SMARKETS = spawn('node', ['./smarkets-generic.js', SELECTION]);
  }

  // listen for data

  SMARKETS.stdout.on('data', data => {
    try {
      console.log(`data from smarkets bot for ${SELECTION}`);
      const dataObj = JSON.parse(data.toString());
      console.log(dataObj);
      //checkForArbs('smarkets', dataObj);
      return saveData('smarkets', dataObj);
    } catch(err) {
      console.error(err);
      console.log(`terminating existing Smarkets BOT for ${SELECTION}`);
      process.kill(SMARKETS.pid);
      console.log(`respawning Smarkets BOT for ${SELECTION}`);
      return spawnSmarketsBot();
    }
  });

  SMARKETS.stderr.on('data', err => {
    console.error(`SMARKETS err for ${SELECTION}...`);
    console.error(err.toString());
    console.log(`terminating existing Smarkets BOT for ${SELECTION}`);
    process.kill(SMARKETS.pid);
    console.log(`respawning Smarkets BOT for ${SELECTION}`);
    return spawnSmarketsBot();
  });

  SMARKETS.on('error', err => {
    console.error(`SMARKETS CP err for ${SELECTION}...`);
    console.error(err);
    console.log(`terminating existing Smarkets BOT for ${SELECTION}`);
    process.kill(SMARKETS.pid);
    console.log(`respawning Smarkets BOT for ${SELECTION}`);
    return spawnSmarketsBot();
  });

  SMARKETS.on('close', code => {
    if(code < 1) {
      return console.log(`SMARKETS BOT for ${SELECTION} closed normally...`);
    } else {
      return console.error(`SMARKETS BOT for ${SELECTION} closed abnormally...`);
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
  // check if oddsType from bot has already changed
  if(!betfairDeltas[data.betType]) {// if not update and save in memory
    betfairDeltas[data.betType] = data;
  } else if(!betfairDeltas[data.betType].timestampTo) {// oddsType already in memory, it has just changed
    data.timestampTo = data.timestampFrom;
    data.timestampFrom = betfairDeltas[data.betType].timestampFrom;
    // delete existing in memory object
    betfairDeltas[data.betType] = null;
  }
  // check if matched amount has changed
  if(betfairDeltas.matchedAmount == data.matchedAmount) {// has NOT changed don't save new matchedAmount
  delete data.matchedAmount;
  } else {// has changed, update betfairDeltas.matchedAmount and save new matchedAmount
  betfairDeltas.matchedAmount = data.matchedAmount;
  }
  // push data obj into 'betfair' array
  const addNewData = await DB_CONN.collection(COLLECTION).findOneAndUpdate({eventLabel: EVENT_LABEL, selection: SELECTION}, {$push: {
      b: data
    }});
  if(addNewData.lastErrorObject.updatedExisting) {
    console.log(`added new betfair data for ${SELECTION}...`);
    return Promise.resolve(true);
  } else {
    const newErr = new Error(`failed to update betfair data for ${SELECTION}...`);
    return Promise.reject(newErr);
  }
}

async function saveSmarketsData(data) {
  // check if oddsType from bot has already changed
  if(!smarketsDeltas[data.betType]) {// if not update and save in memory
    smarketsDeltas[data.betType] = data;
  } else if(!smarketsDeltas[data.betType].timestampTo) {// oddsType already in memory, it has just changed
    data.timestampTo = data.timestampFrom;
    data.timestampFrom = smarketsDeltas[data.betType].timestampFrom;
    // delete existing in memory object
    smarketsDeltas[data.betType] = null;
  }
  // check if matched amount has changed
  if(smarketsDeltas.matchedAmount == data.matchedAmount) {// has NOT changed don't save new matchedAmount
  delete data.matchedAmount;
  } else {// has changed, update betfairDeltas.matchedAmount and save new matchedAmount
  smarketsDeltas.matchedAmount = data.matchedAmount;
  }
  // push data obj into 'smarkets' array
  const addNewData = await DB_CONN.collection(COLLECTION).findOneAndUpdate({eventLabel: EVENT_LABEL, selection: SELECTION}, {$push: {
      s: data
    }});
  if(addNewData.lastErrorObject.updatedExisting) {
    console.log(`added new smarkets data for ${SELECTION}...`);
    return Promise.resolve(true);
  } else {
    const newErr = new Error(`failed to update smarkets data for ${SELECTION}...`);
    return Promise.reject(newErr);
  }
}

/*function checkForArbs(exchange, data) {
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
        console.log(`Arb exists for ${SELECTION}`);
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
          selection: SELECTION,
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
        console.log(`Arb exists for ${SELECTION}`);
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
          selection: SELECTION,
          liquidity: arbsLiquidity,
          timestamp: data.timestamp
        };
        console.log(arbsData);
        return saveArbs(arbsData);
      }
    }
  }
}*/

/*async function saveArbs(data) {
  // push data obj into 'arbs' array
  const addNewData = await DB_CONN.collection(COLLECTION).findOneAndUpdate({eventLabel: EVENT_LABEL, selection: SELECTION, flag: 'arbs'}, {$push: {
      arbs: data
    }});
  if(addNewData.lastErrorObject.updatedExisting) {
    console.log('addNewData arbs...');
    return Promise.resolve(true);
  } else {
    const newErr = new Error(`failed to add arbs for ${SELECTION}`);
    return Promise.reject(newErr);
  }
}*/

async function listenForCloseEvent(flag) {
  if(flag == 'HR') {
    return listenForHREventClose();
  } else {
    return listenForGenericEventClose();
  }
}

async function listenForHREventClose() {
  // instantiate browser
  const browser = await P.launch({
    headless: false,
    timeout: 180000
  });
  // create blank page
  const page = await browser.newPage();
  // set viewport to 1366*768
  await page.setViewport({width: 1366, height: 768});
  // set the user agent
  await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko)');
  // navigate to RACE_URL
  await page.goto(EVENT_END_URL, {
    waitUntil: 'networkidle2',
    timeout: 180000
  });
  // wait for 30 secs
  await page.waitFor(30*1000);
  // define checkEventEnd function
  async function checkEventEnd() {
    console.log('checkEventEnd invoked...');
    // get all events on page
    const events = await page.$$eval(HR_EVENT_LINKS_SELECTOR, (events, BETFAIR_URL) => {
      console.log('querying for events...');
      const eventNotEnded = events.filter(event => event.href == BETFAIR_URL);
      console.log('eventNotEnded obj...');
      console.log(eventNotEnded);
      return eventNotEnded;
    }, BETFAIR_URL);
    if(events.length > 0) {// event has NOT ended
      console.log(`event has NOT ended for ${SELECTION}...`);
      console.log('closing puppeteer browser and rechecking in 5 mins...');
      await browser.close();
      return setTimeout(listenForHREventClose, 300000);
    } else {
      console.log(`event has ended for ${SELECTION}...`);
      process.kill(BETFAIR.pid);
      process.kill(SMARKETS.pid);
      return process.exit(0);
    }
  }
  return checkEventEnd();
}

async function listenForGenericEventClose() {
  const sortedTargetsArray = TARGETS.sort();
  const sortedTargetsString = sortedTargetsArray.join(', ');
  console.log('sortedTargetsString');
  console.log(sortedTargetsString);
  // instantiate browser
  const browser = await P.launch({
    headless: false,
    timeout: 180000
  });
  // create blank page
  const page = await browser.newPage();
  // set viewport to 1366*768
  await page.setViewport({width: 1366, height: 768});
  // set the user agent
  await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko)');
  // navigate to RACE_URL
  await page.goto(EVENT_END_URL, {
    waitUntil: 'networkidle2',
    timeout: 180000
  });
  // wait for 30 secs
  await page.waitFor(30*1000);
  // define checkEventEnd function
  async function checkEventEnd() {
    console.log('checkEventEnd invoked...');
    // get all events on page
    const eventFound = await page.$$eval(GENERIC_EVENT_LINKS_SELECTOR, (events) => {
      console.log('querying for events...');
      const result = events.map(event => {
        let eventTargetsArray = event.innerText.split('vs.');
        let trimmedeventTargetsArray = eventTargetsArray.map(item => item.trim());
        console.log('trimmedeventTargetsArray');
        console.log(trimmedeventTargetsArray);
        trimmedeventTargetsArray.sort();
        let eventTargetsArraySortedString = trimmedeventTargetsArray.join(', ');
        eventTargetsArraySortedString = eventTargetsArraySortedString.trim();
        let eventStatus = event.parentElement.parentElement.children[1].children[0].innerText.toLowerCase();
        return {
          label: eventTargetsArraySortedString,
          status: eventStatus
        };
      });
      console.log('result..');
      console.log(result);
      return result;
    });
    console.log('eventFound');
    console.log(eventFound);
    const ongoing = eventFound.filter(event => event.label == sortedTargetsString);
    console.log('ongoing');
    console.log(ongoing);
    if(!!ongoing[0] && ongoing[0].status != 'event ended') {// event has NOT ended
      console.log(`event has NOT ended for ${SELECTION}...`);
      console.log('closing puppeteer browser and rechecking in 5 mins...');
      await browser.close();
      return setTimeout(listenForGenericEventClose, 300000);
    } else {
      console.log(`event has ended for ${SELECTION}...`);
      console.log('terminating BOTs and selection processes...');
      process.kill(BETFAIR.pid);
      process.kill(SMARKETS.pid);
      await browser.close();
      return process.exit(0);
    }
  }
  return checkEventEnd();
}

// execute
connectToDB()
  .then(ok => createSelectionDeltaDoc())/*
  //.then(ok => createSelectionArbsDoc())
  .then(ok => {
    console.log(`spawning streaming BOTs for ${SELECTION}...`);
    return spawnBots();
  })
  .then(ok => {
    console.log('ready to listen for event ended');
    let flag;
    if(COLLECTION == 'horse-racing') {
      flag = 'HR';
    } else {
      flag = 'GENERIC';
    }
    return listenForCloseEvent(flag);
  })
  .catch(err => console.error(err));*/
