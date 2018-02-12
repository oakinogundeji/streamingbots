'use strict';
//=============================================================================
const mongoose = require('mongoose');
mongoose.plugin(require('mongoose-write-stream'));
//=============================================================================
// Schema
const EventCardSchema = mongoose.Schema({
  eventLabel: {
    type: String,
    required: true
  },
  eventDate: {
    type: Date,
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
