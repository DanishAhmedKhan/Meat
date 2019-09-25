const mongoose = require('mongoose');
const config = require('config');
const jwt = require('jsonwebtoken');

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const produstSchema = new Schema({
    type: {
        type: String,
        enum: [ 'chicken', 'mutton', 'fish' ],
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    price: {
        value: Number,
        quantity: Number, // in kg
    },
    images: [{
        url: String,
        size: [ Number ],
    }],
    description: String,
    quality: [{
        name: String,
        detail: String,
    }],
    stats: {
        order: Number,
    },
    allOrders: [{
        type: ObjectId,
        red: 'Order',
    }],
});

const Product = mongoose.model('Product', produstSchema);
module.exports = Product;