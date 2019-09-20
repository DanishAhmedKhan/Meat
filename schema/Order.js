const mongoose = require('mongoose');
const config = require('config');
const jwt = require('jsonwebtoken');

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const orderSchema = new Schema({
    user: {
        id: {
            type: ObjectId,
            ref: 'User',
        },
        token: String,
        number: String,
    },
    deliveryBoy: {
        id: {
            type: ObjectId,
            ref: 'DeliveryBoy',
        },
        token: String,
        number: String,
    },
    userAddress: {
        name: String,
        address: {
            line: String, 
            state: String, 
            city: String, 
            zip: String 
        },
        location:{
            type: {
                type: String, 
                enum: [ 'Point' ],
                default: 'Point',
            },
            coordinates: {
                type: [Number]
            }
        }
    },
    status: Number,
    timing: {
        book: Date,
        pickup: Date,
        drop: Date,
    },
    stats: {
        totalPrice: Number,
        discount: {
            value: Number,
            orignalPrice: Number,
        },
        item: [{
            productId: ObjectId,
            quantity: Number,
            unit: String,
        }],
        distance: Number,
        deliveryFare: Number,
        deliveryFareDetails: {
            deliveryCost: Number,
            waitTimeCost: Number,
            travelCost: Number,
        },
        deliveryTime: Number,
    },
    rating: {
        user: Number,
        deliveryBoy: Number,
    },
    complaint: {
        value: Boolean,
        message: String
    },
    cancel: {
        value: Boolean,
        by: {
            type: String,
            enum: ['user', 'deliveryBoy']
        },
        time: Date,
    }
});

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;