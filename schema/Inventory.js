const mongoose = require('mongoose');
const config = require('config');
const jwt = require('jsonwebtoken');

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const inventorySchema = new Schema({
    token: [{
        type: String,
    }],
    password: String,
    phoneNumber: String,
    helplineNumbers: [{
        type: String,
    }],
    location: {
        type: {
            type: String,
            enum: [ 'Point' ], 
            default: 'Point',
        },
        coordinates: {
            type: [ Number ]
        }
    },
    address: {
        line: String,
        state: String,
        city: String,
        zip: String,
    },
});

inventorySchema.methods.generateAuthToken = function() {
    return jwt.sign({ _id: this._id }, config.get('inventoryAuthToken'));
};

const Inventory = mongoose.model('DeliveryGuy', inventorySchema);
module.exports = Inventory;