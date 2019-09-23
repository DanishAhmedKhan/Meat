const mongoose = require('mongoose');
const dateTimeSchema = require('../schema/dateTimeSchema');

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
    inventory: {
        id: {
            type: ObjectId,
            ref: 'Inventory',
        },
    },
    deliveryBoy: {
        id: {
            type: ObjectId,
            ref: 'DeliveryBoy',
        },
        token: String,
        number: String,
    },
    deliveryDate: {
        type: dateTimeSchema,
    },
    userAddress: {
        name: String,
        address: {
            line: String, 
            state: String, 
            city: String,
            zip: String,
        },
        location:{
            type: {
                type: String,
                enum: [ 'Point' ],
                default: 'Point',
            },
            coordinates: {
                type: [ Number ]
            }
        }
    },
    status: Number,
    timing: {
        book: dateTimeSchema,
        pickup: dateTimeSchema,
        drop: dateTimeSchema,
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
    },
    deliveryDetail: {
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
            enum: [ 'user', 'deliveryBoy' ]
        },
        time: Date,
    }
});

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;