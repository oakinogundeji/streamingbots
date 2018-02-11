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
  selection: {
    type: String,
    required: true
  },
  b: {
    type : Array ,
    default: []
  },
  s: {
    type : Array ,
    default: []
  }
});
// create index on 'eventLabel'
SelectionDocSchema.index({eventLabel: 1, selection: 1});
// compile to Model
const SelectionDocModel = mongoose.model('SelectionDoc', SelectionDocSchema);
// export model
module.exports = SelectionDocModel;
