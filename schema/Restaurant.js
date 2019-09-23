const mongoose = require('mongoose');

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
    name: {
        type: String,
        maxlength: 255,
    },
    email: {
        type: String,
        unique: true,
        minlength: 5,
        maxlength: 255,
    },
    password: {
        type: String,
    },
    phoneNumber: {
        type: String,
    },
    meatServerd: [{
        type: String,
        enum: [ 'mutton', 'chicken', 'fish' ],
    }],
    address: {
        line: String, 
        state: String, 
        city: String, 
        zip: String 
    },
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
    orders: [{
        type: ObjectId,
        ref: 'Order',
    }]
});

userSchema.methods.generateAuthToken = function() {
    return jwt.sign({ _id: this._id }, config.get('restaurantAuthToken'));
};

const Restaurant = mongoose.model('Restaurant', restaurantSchema);
module.exports = Restaurant;