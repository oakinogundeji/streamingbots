'use strict';
//=============================================================================
const mongoose = require('mongoose');
//=============================================================================
// Schema
const SelectionArbsDocSchema = mongoose.Schema({
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
  arbs: [
    {
      selection: {
        type: String,
        required: true
      },
      timestampFrom: {
        type: Date,
        required: true
      },
      timestampTo: {
        type: Date,
        default: null
      },
      b: {
        b0: {
          odds: {
            type: Number,
            required: true
          },
          liquidity: {
            type: Number,
            required: true
          }
        },
        l0: {
          odds: {
            type: Number,
            required: true
          },
          liquidity: {
            type: Number,
            required: true
          }
        },
        b1: {
          odds: {
            type: Number,
            required: true
          },
          liquidity: {
            type: Number,
            required: true
          }
        },
        l1: {
          odds: {
            type: Number,
            required: true
          },
          liquidity: {
            type: Number,
            required: true
          }
        },
        b2: {
          odds: {
            type: Number,
            required: true
          },
          liquidity: {
            type: Number,
            required: true
          }
        },
        l2: {
          odds: {
            type: Number,
            required: true
          },
          liquidity: {
            type: Number,
            required: true
          }
        },
        matchedAmount: {
          type: Number,
          required: true
        }
      },
      s: {
        b0: {
          odds: {
            type: Number,
            required: true
          },
          liquidity: {
            type: Number,
            required: true
          }
        },
        l0: {
          odds: {
            type: Number,
            required: true
          },
          liquidity: {
            type: Number,
            required: true
          }
        },
        b1: {
          odds: {
            type: Number,
            required: true
          },
          liquidity: {
            type: Number,
            required: true
          }
        },
        l1: {
          odds: {
            type: Number,
            required: true
          },
          liquidity: {
            type: Number,
            required: true
          }
        },
        b2: {
          odds: {
            type: Number,
            required: true
          },
          liquidity: {
            type: Number,
            required: true
          }
        },
        l2: {
          odds: {
            type: Number,
            required: true
          },
          liquidity: {
            type: Number,
            required: true
          }
        },
        matchedAmount: {
          type: Number,
          required: true
        }
      },
      back: {
        type: String,
        required: true
      },
      lay: {
        type: String,
        required: true
      }
    }
  ]
});
// create index on 'eventLabel'
SelectionArbsDocSchema.index({eventLabel: 1, selection: 1});
// compile to Model
const SelectionArbsDocModel = mongoose.model('SelectionArbsDoc', SelectionArbsDocSchema);
// export model
module.exports = SelectionArbsDocModel;
