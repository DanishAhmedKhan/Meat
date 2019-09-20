const express = require('express');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const uuid = required('uuid');
const nexmo = require('nexmo');
const Joi = require('joi');
const randomatic = require('randomatic');
const _ = require('lodash');
const __ = require('./apiUtil');
const User = require('../schema/User');
const Order = require('../schema/Order');
const Inventory = require('../schema/Inventory');
const Product = require('../schema/Product');
const status = require('./status');

const router = express.Router();

const registerNumber = async (req, res) => {
    const error = __.validate(req.body, {
        number: Joi.string().required(),
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    const code = randomatic.randomize('0', 4);
    const senderPhoneNumber = '6664442221';
    const recipientPhoneNumber = req.body.number;

    nexmo.message.sendSMS(
        senderPhoneNumber, recipientPhoneNumber, code, { type: 'unicode' },
        (error, responseDate) => {
            if (error) return res.status(503).send(__.error('Server error. Please Retry.'));
            else {
                console.log(responseDate);
                const newUser = new User({
                    phoneNumber: req.body.number,
                    verificationCode: code,
                });
                await newUser.save();
                res.status(200).send(__.success(newUser._id));
            }
        }
    );
};

const rsendVerificationCode = async (req, res) => {
    const error = __.validate(req.body, {
        number: Joi.string().required(),
    });
    if (error) return res.status(200).send(__.error(error.details[0].message));

    const code = randomatic.randomize('0', 4);
    const senderPhoneNumber = '6664442221';
    const recipientPhoneNumber = req.body.number;

    nexmo.message.sendSMS(
        senderPhoneNumber, recipientPhoneNumber, code, { type: 'unicode' },
        (error, responseDate) => {
            if (error) return res.status(503).send(__.error('Server error. Please Retry.'));
            else {
                console.log(responseDate);
                res.status(200).send(__.success('Code resent'));
            }
        }
    );
};

const verifyNumber = async (req, res) => {
    const error = __.validate(req.body, {
        number: Joi.string().required(),
        code: Joi.string().required(),
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    const { verificationCode } = await User.findOne({ _id: req.user._id }, 'verificationCode');
    if (req.body.code === verificationCode) {
        await User.updateOne({ _id: req.user._id }, {
            $unset: { verificationCode: 1 }
        });
        
        res.status(200).send(__.success('Number verified.'));
    }
};

const password = async (req, res) => {
    const error = __.validate(req.body, {
        deviceId: Joi.string().required(),
        password: Joi.string().required(),
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);

    await User.updateOne({ _id: req.user._id }, {
        $set: { 
            deviceId: req.body.deviceId,
            password: hashedPassword 
        }
    });

    res.status(200).send(__.success('Password set.'));
}

const profile = async (req, res) => {
    const error = __.validate(req.body, {
        email: Joi.string().email().required(),
        username: Joi.string().required(),
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    await User.updateOne({ _id: req.user._id }, {
        $set: {

        }
    });

    res.status(200).send(__.success('Profile added'));
};  

const signup = async (req, res) => {
    const error = __.validate(req.body, {
        deviceId: Joi.string().required(),
        token: Joi.string().required(),
        email: Joi.string().email(),
        password: Joi.string().required(),
        phoneNumber: Joi.string().required(),
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    let user;
    user = await User.findOne({ 'credential.phoneNumber': req.body.phoneNumber });
    if (user) return res.status(400).send(__.error('This phone number is already registered.'));
    
    user = {
        deviceId: req.body.deviceId,
        token: req.body.token,
        credential: {
            email: req.body.email,
            password: req.body.password,
            phoneNumber: req.body.phoneNumber,
        }
    };

    const salt = await bcrypt.genSalt(10);
    user.credential.password = await bcrypt.hash(user.credential.password, salt);

    const newUser = new User(user);
    await newUser.save();
    const token = newUser.generateAuthToken();

    res.header('x-user-auth-token', token)
       .status(200)
       .send(__.success('Signed up.'));
}

const checkDeviceId = async (req, res) => {
    const error = __.validate(req.body, {
        deviceId: Joi.string().required(),
    });
    if (error) res.status(400).send(__.error(error.message[0].details));

    const user = await User.findOne({ deviceId: req.body.deviceId });
    return res.status(200).send(__.success(user != null));
};

const login = async (req, res) => {
    const error = __.validate(req.body, {
        phoneNumber: Joi.string().required(),
        password: Joi.string().required(),
        token: Joi.string().required(),
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    let user = await User.findOne({ phoneNumber: req.body.phoneNumber });
    if (!user) return res.status(400).send(__.error('The phone number is not registered'));

    const validPassword = await bcrypt.compare(req.body.password, user.password);
    if (!validPassword) return res.status(400).send(__.error('Invalid password'));

    await User.updateOne({ _id: user._id }, {
        $set: { token: req.body.token }
    });

    const token = user.generateAuthToken();
    res.header('x-user-auth-token', token)
       .status(200)
       .send(__.success('Loged in.'));
};

const token = async (req, res) => {
    const error = __.validate(req.body, {
        token: Joi.string().required(),
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    await User.updateOne({ _id: req.user._id }, {
        $set: { token: req.body.token }
    });

    res.send(200).send(__.success('Token updated.'));
};

const order = async (req, res) => {
    const error = __.validate(req.body, {
        addressLabelNumber: Joi.number().required(),
        totalPrice: Joi.number().required(),
        order: Joi.object({
            productId: Joi.string().required(),
            quantity: Joi.number().required(),
            unit: Joi.number().required(),
        }),
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    const user = await User.findOne({ _id: req.user._id }, 
        'phoneNumber token label');
    
    const nearestInventory = await Inventory.findOne({
        geolocation: {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates: user.label[req.body.labelNumber].location.coordinates,
                },
                $maxDistance: 10000 // 10km
            },
        },
    }, '_id token phoneNumber');

    let order = new Order({
        user: {
            id: req.user._id,
            token: user.token,
            number: user.phoneNumber
        },
        inventory: {
            id: nearestInventory._id,
            token: nearestInventory.token,
            phoneNumber: nearestInventory.phoneNumber,
        },
        stats: {
            totalPrice: req.body.totalPrice,
            item: req.body.order,
        },
        userAddress: user.label[req.body.addressLabelNumber],   
        timing: {
            book: new Date(),
        },
        status: status.USER_BOOKED,
    });

    await order.save();
    await User.updateOne({ _id: req.user._id }, {
        $set: { currentOrder: order._id },
        $push: { orders: order._id },
    });

    __.sendNotification({
        data: {
            status: status.USER_BOOKED,
            order: order + ''
        },
        token: nearestInventory.token,
    });

    res.status(200).send(__.success(order._id));
};

const cancelOrder = async (req, res) => {
    const error = __.validate(req.body, {
        orderId: Joi.string().required(),
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    const order = await Order.findOneAndUpdate({ _id: req.body.orderId }, {
        $set: {
            status: status.USER_CANCELLED,
            cancel: {
                cancel: true,
                value: 'user',
                time: new Date(),
            }
        }
    });

    await User.updateOne({ _id: req.user._id }, {
        $push: { cancelOrders: req.body.orderId },
        $inc: { 'stats.cencelOrder': 1 },
    });

    __.sendNotification({
        data: { status: status.USER_CANCELLED },
        token: order.inventory.token,
    });
};

router.post('./registerNumber', registerNumber);
router.post('./resendVerificationCode', rsendVerificationCode);
router.post('./verifyNumber', verifyNumber);
router.post('./password', password);
router.post('./profile', profile);
router.post('./signup', signup);
router.post('./login', login);
router.post('./checkDeviceId', checkDeviceId);
router.post('./token', token);
router.post('./order', order);

module.exports = router;