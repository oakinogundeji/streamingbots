'use strict';
//=============================================================================
const mongoose = require('mongoose');
mongoose.plugin(require('mongoose-write-stream'));
//=============================================================================
// Schema
const BotDataSchema = {
  betType: {
    type: String,
    required: true
  },
  odds: {
    type: Number,
    required: true
  },
  matchedAmount: {
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
};
// create index on 'betType'
BotDataSchema.index({betType: 1});
// compile to Model
const BotDataModel = mongoose.model('BotData', BotDataSchema);
// export model
module.exports = BotDataModel;
