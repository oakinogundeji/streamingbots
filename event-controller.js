'use strict';
if(process.env.NODE_ENV != 'production') {
  require('dotenv').config();
}
//=============================================================================
// dependencies
const
  {fork} = require('child_process'),
  crypto = require('crypto'),
  P = require('puppeteer'),
  Promise = require('bluebird'),
  mongoose = require('mongoose'),
  moment = require('moment'),
  DBURL = process.env.DBURL,
  EventCardModel = require('./models/event-cards'),
  SMARKETS_URL = process.env.SMARKETS_URL,
  SMARKETS_EVENTS_CONTAINER_SELECTOR = 'ul.contracts',
  SMARKETS_SELECTIONS_SELECTOR = 'div.contract-info';

let selectionsList;
// helper functions

async function getSelections() {
  // setup
  let
    sport,
    flag;
  const URL_ARR = SMARKETS_URL.split('/');
  sport = URL_ARR[6];
  if(sport == 'horse-racing' ) {
    flag = 'HR';
  } else {
    flag = 'GENERIC';
  }
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
  await page.goto(SMARKETS_URL, {
    waitUntil: 'networkidle2',
    timeout: 180000
  });
  // ensure race container selector available
  await page.waitForSelector(SMARKETS_EVENTS_CONTAINER_SELECTOR);
  // allow 'page' instance to output any calls to browser log to node log
  page.on('console', data => console.log(data.text()));
  console.log('SMARKETS_EVENTS_CONTAINER_SELECTOR found, continuing...');
  // get list of selections
  selectionsList = await page.$$eval(SMARKETS_SELECTIONS_SELECTOR, (targets, flag) => {
    let selectionsList = [];
    if(flag == 'HR') {
      targets.filter(target => {
        if(target.parentElement.nextElementSibling.children[0].className == 'price-section') {
          const selection = target.children[1].children[0].innerText;
          console.log(`selection info for HR: ${selection}`);
          return selectionsList.push(selection);
        }
      });
    } else {
      targets.forEach(target => {
        const selection = target.innerText;
        console.log(`selection info for GENERIC: ${selection}`);
        return selectionsList.push(selection);
      });
    }
    return selectionsList;
  }, flag);
  await browser.close();
  return Promise.resolve(true);
}

async function createEventCard() {

  // setup
  let
    sport,
    eventLabel,
    eventDate,
    EVENT_ARR,
    timeLabel = moment().format('L');
  timeLabel = timeLabel.split('/').reverse().join('-');
  let URL_ARR = SMARKETS_URL.split('/');
  sport = URL_ARR[6];
  if(sport == 'horse-racing' ) {
    EVENT_ARR = URL_ARR.slice(7);
    eventLabel = EVENT_ARR[0] +'|'+ EVENT_ARR[1] +'-'+ EVENT_ARR[2] +'-'+ EVENT_ARR[3] +' '+ EVENT_ARR[4];
  } else {
    const eventName = URL_ARR.pop();
    eventLabel = eventName +'|'+ timeLabel;
  }
  eventDate = EVENT_ARR[1] +'-'+ EVENT_ARR[2] +'-'+ EVENT_ARR[3];
  // create initial EVENT Card
  let eventCard = {
    eventLabel,
    eventDate,
    sport,
    selectionsList,
    country: 'GB',
    outcome: 'WIN'
  };
  console.log('eventCard...');
  console.log(eventCard);
  // create eventCard for event if NOT exists
  const query = EventCardModel.findOne({eventLabel: eventCard.eventLabel, sport: eventCard.sport});
  const alreadyExists = await query.exec();
  if(!!alreadyExists && (alreadyExists.eventLabel == eventCard.eventLabel)) {
    console.log(`${alreadyExists.eventLabel} already exists...`);
    return Promise.resolve({eventLabel: alreadyExists.eventLabel, sport: sport, eventDate: alreadyExists.eventDate});
  } else {
    const newEventCard = new EventCardModel(eventCard);
    const saveNewEventCard = await newEventCard.save();
    if(saveNewEventCard.eventLabel == eventCard.eventLabel) {
      console.log(`successfully created eventCard for ${saveNewEventCard.eventLabel}`);
      return Promise.resolve({eventLabel: saveNewEventCard.eventLabel, sport: sport, eventDate: saveNewEventCard.eventDate});
    } else {
      console.error(`failed to create eventCard for ${eventCard.eventLabel}`);
      const newErr = new Error(`failed to create eventCard for ${eventCard.eventLabel}`);
      return Promise.reject(newErr);
    }
  }
}

function forkSelection(SELECTION, eventIdentifiers) {
  const SELECTION_INFO = JSON.stringify(eventIdentifiers);
  console.log(`launching SELECTION for ${SELECTION}...`);
  return fork('./selection.js', [SELECTION, SELECTION_INFO]);
}

// connect to DBURL
let db;
const options = {
  promiseLibrary: Promise,
  reconnectTries: Number.MAX_VALUE,
  reconnectInterval: 500,
  poolSize: 10,
  socketTimeoutMS: 0,
  keepAlive: true,
  autoIndex: false
};

process.on('SIGINT', () => {
  mongoose.connection.close(() => {
    console.log('Event-Controller dBase connection closed due to app termination');
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
       console.info(`Event-Controller successfully connected to ${DBURL}`);
       return resolve(true);
     });
     db.once('disconnected', () => {
       console.info('Event-Controller successfully disconnected from ' + DBURL);
     });
   });
 }

connectToDB()
  .then(ok => {
    console.log('getting selections...');
    return getSelections();
  })
  .then(ok => {
    console.log('selectionsList...');
    console.log(selectionsList);
    return Promise.resolve(true);
  })
  .then(ok => createEventCard())
  .then(eventIdentifiers => {
    console.log('all good...');
    console.log('launching SELECTIONs...');
    // create 1 SELECTION per selection
    if(eventIdentifiers.sport != 'horse-racing') {
      eventIdentifiers.targets = selectionsList.filter(selection => selection.toLowerCase() != 'draw');
      console.log('event-controller closing db connection...');
      db.close();
      return forkSelection(selectionsList[0], eventIdentifiers);
      //return selectionsList.forEach(selection => forkSelection(selection, eventIdentifiers));
    } else {
      console.log('event-controller closing db connection...');
      db.close();
      return forkSelection(selectionsList[0], eventIdentifiers);
      //return selectionsList.forEach(selection => forkSelection(selection, eventIdentifiers));
    }
  })
  .catch(err => console.error(err));
