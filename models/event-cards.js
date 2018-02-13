'use strict';
//=============================================================================
const mongoose = require('mongoose');
//=============================================================================
// Schema
const EventCardSchema = mongoose.Schema({
  eventLabel: {
    type: String,
    required: true
  },
  eventDate: {
    type: String,
    required: true
  },
  sport: {
    type: String,
    required: true
  },
  selectionsList: [String],
  country: {
    type: String,
    required: true,
    default: 'GB'
  },
  outcome: {
    type: String,
    required: true,
    DEFAULT: 'WIN'
  }
});
// create index on 'eventLabel'
EventCardSchema.index({eventLabel: 1});
// compile to Model
const EventCardModel = mongoose.model('EventCard', EventCardSchema);
// export model
module.exports = EventCardModel;
