const mongoose = require('mongoose');
const config = require('config');
const jwt = require('jsonwebtoken');

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const deliveryBoySchema = new Schema({
    deviceId: {
        type: String, 
        unique: true,
        required: true,
    },
    token: {
        type: String,
        unique: true,
        required: true,
    },
    status: {
        online: Boolean,
        order: Boolean
    },
    useranme: {
        type: String,
    },
    email: {
        type: String,
        unique: true,
    },
    password: {
        type: String,
    },
    phoneNumber: {
        type: String,
    },
    uid: String,
    delivery: [{
        type: ObjectId,
        ref: 'Order',
    }],
    currentDelivery: [{
        type: ObjectId,
        ref: 'Order',
    }],
    geolocation: {
        type: {
            type: String,
            enum: [ 'Point' ],
        },
        coordinates: {
            type: [Number],
        }
    },
    shifts: [{
        time: Date,
        method: {
            type: String, 
            enum: ['login', 'logout', 'online', 'offline']
        }
    }],
});

inventorySchema.methods.generateAuthToken = function() {
    return jwt.sign({ _id: this._id }, config.get('deliveryBoyAuthToken'));
};

const DeliveryBoy = mongoose.model('DeliveryBoy', deliveryBoySchema);
module.exports = DeliveryBoy;