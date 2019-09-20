const mongoose = require('mongoose');
const config = require('config');
const jwt = require('jsonwebtoken');

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const userSchema = new Schema({
    deviceId: {
        type: String,
        unique: true,
    },
    token: {
        type: String,
        unique: true,
    },
    username: {
        type: String,
        minlength: 4,
        maxlength: 255,
    },
    email: {
        type: String,
        unique: true,
        minlength: 4,
        maxlength: 255
    },
    password: {
        type: String,
    },
    phoneNumber: {
        type: String,
        minlength: 10,
    },
    verificationCode: {
        type: String,
    },
    loggenIn: {
        type: Boolean,
        default: false,
    },
    orders: [{
        type: ObjectId,
        ref: 'Order',
    }],
    currentOrder: {
        type: ObjectId,
        ref: 'Order',
    },
    cancelOrders: [{
        type: ObjectId,
        ref: 'Order',
    }],
    label: [{
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
                enum: ['Point'],
                default: 'Point',
            },
            coordinates: {
                type: [Number]
            }
        }
    }],
    stats: {
        cancelOrder: Number,
    }
});

userSchema.methods.generateAuthToken = function() {
    return jwt.sign({ _id: this._id }, config.get('userAuthToken'));
};

const User = mongoose.model('User', userSchema);
module.exports = User;