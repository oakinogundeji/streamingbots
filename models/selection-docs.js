'use strict';
//=============================================================================
const mongoose = require('mongoose');
//=============================================================================
// Schema
const SelectionDocSchema = mongoose.Schema({
  eventLabel: {
    type: String,
    required: true
  },
  eventDate: {
    type: String,
    required: true
  },
  selection: {
    type: String,
    required: true
  },
  b: [{
    betType: {
      type: String,
      required: true
    },
    matchedAmount: {
      type: Number,
      required: true
    },
    odds: {
      type: Number,
      required: true
    },
    liquidity: {
      type: Number,
      required: true
    },
    timestamp: {
      type: Date,
      required: true
    }
  }],
  s: [{
    betType: {
      type: String,
      required: true
    },
    matchedAmount: {
      type: Number,
      required: true
    },
    odds: {
      type: Number,
      required: true
    },
    liquidity: {
      type: Number,
      required: true
    },
    timestamp: {
      type: Date,
      required: true
    }
  }]
});
// create index on 'eventLabel'
SelectionDocSchema.index({eventLabel: 1, selection: 1});
// compile to Model
const SelectionDocModel = mongoose.model('SelectionDoc', SelectionDocSchema);
// export model
module.exports = SelectionDocModel;
