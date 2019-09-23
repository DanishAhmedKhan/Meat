const mongoose = require('mongoose');
const config = require('config');
const jwt = require('jsonwebtoken');
const dateTimeSchema = require('../schema/dateTimeSchema');

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const inventorySchema = new Schema({
    token: [{
        value: String,
        online: Boolean,
    }],
    password: String,
    phoneNumber: String,
    helplineNumbers: [{
        type: String,
    }],
    online: Boolean,
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
    currentOrders: [{
        type: ObjectId,
        ref: 'Order',
    }],
    orders: [{
        type: ObjectId,
        ref: 'Order',
    }],
    restaurentOrders: [{
        orderId: {
            type: ObjectId,
            ref: 'Order',
        },
        deliveryDate: dateTimeSchema,
    }],
}, {
    strict: false,
});

inventorySchema.methods.generateAuthToken = function() {
    return jwt.sign({ _id: this._id }, config.get('inventoryAuthToken'));
};

const Inventory = mongoose.model('DeliveryGuy', inventorySchema);
module.exports = Inventory;