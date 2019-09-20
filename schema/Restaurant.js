const mongoose = require('mongoose');
const config = require('config');
const jwt = require('jsonwebtoken');

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const restaurantSchema = new Schema({
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
    credential: {
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
        name: String,
    },
    location: {
        type: {
            type: String, 
            enum: ['Point'], 
            default: 'Point', 
        },
        coordinates: {
            type: [Number]
        }
    },
});

const Restaurant = mongoose.model('DeliveryGuy', restaurantSchema);
module.exports = Restaurant;