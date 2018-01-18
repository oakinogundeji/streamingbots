'use strict';
//=============================================================================
// dependencies
const mongoose = require('mongoose');
mongoose.plugin(require('mongoose-write-stream'));

// define races schema

const RaceSchema = {
  label: {
    type: String,
    required: true
  },
  
};
