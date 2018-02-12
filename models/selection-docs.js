'use strict';
//=============================================================================
const mongoose = require('mongoose');
mongoose.plugin(require('mongoose-write-stream'));
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
    timestampFrom: {
      type: Date,
      required: true
    },
    timestampTo: {
      type: Date,
      default: null
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
    timestampFrom: {
      type: Date,
      required: true
    },
    timestampTo: {
      type: Date,
      default: null
    }
  }]
});
// create index on 'eventLabel'
SelectionDocSchema.index({eventLabel: 1, selection: 1});
// compile to Model
const SelectionDocModel = mongoose.model('SelectionDoc', SelectionDocSchema);
// export model
module.exports = SelectionDocModel;
