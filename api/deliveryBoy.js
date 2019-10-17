const express = require('express');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const Joi = require('joi');
const randomatic = require('randomatic');
const _ = require('lodash');
const __ = require('./apiUtil');
const User = require('../schema/User');
const Order = require('../schema/Order');
const Inventory = require('../schema/Inventory');
const DeliveryBoy = require('../schema/DeliveryBoy');
const status = require('./status');

const router = express.Router();

const signup = async (req, res) => {
    const error = __.validate(req.body, {
        phoneNumber: Joi.string().required(),
        password: Joi.string().required(),
        username: Joi.string().required(),
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    let deliveryBoy = await DeliveryBoy.findOne({ 
        phoneNumber: req.body.phoneNumber,
    });
    if (deliveryBoy) return res.status(200).send(__.error('This number is already registered.'));

    const uid = randomatic.randomize('A0', 5);

    deliveryBoy = {
        username: req.body.username,
        phoneNumber: req.body.phoneNumber,
        password: req.body.password,
        uid: uid,
    };

    const newDeliveryBoy = new DeliveryBoy(deliveryBoy);
    await newDeliveryBoy.save();
    const token = newDeliveryBoy.generateAuthToken();

    res.header('x-deliveryboy-auth-token', token)
       .status(200)
       .send(__.success(uid));
};

const login = async (req, res) => {
    const error = __.validate(req.body, {
        deviceId: Joi.string().required(),
        token: Joi.string().required(),
        phoneNumber: Joi.string().required(),
        password: Joi.string().required(),
    }); 
    if (error) return res.status(400).send(__.error(error.details[0].message));

    const deliveryBoy = await DeliveryBoy.findOne({ phoneNumber: req.body.phoneNumber });
    if (!deliveryBoy) return res.status(400).send(__.error('Invalid phone number or password'));

    const validPassword = await bcrypt.compare(req.body.password, deliveryBoy.password);
    if (!validPassword) return res.status(400).send(__.error('Invalid phone number or password'));

    await DeliveryBoy.updateOne({ _id: deliveryBoy._id }, {
        $set: { 
            deviceId: req.body.deviceId,
            token: req.body.token,
            status: { 
                online: true,
                order: false,
            }
        },
        $push: {
            shifts: {
                time: new Date(),
                method: 'login',
            }
        }
    });

    const token = deliveryBoy.generateAuthToken();
    res.header('x-deliveryboy-auth-token', token)
       .status(200)
       .send(__.success('Loged in.'));
};

const logout = async (req, res) => {
    await DeliveryBoy.updateOne({ _id: req.deliveryBoy._id }, {
        $set: {
            status: {
                online: false,
                order: false,
            }
        },
        $push: {
            shifts: {
                time: new Date(),
                method: 'logout',
            }
        }
    });

    res.status(200).send(__.success('Successfully logged out.'));
};

const online = async (req, res) => {
    const error = __.validate(req.body, {
        online: Joi.boolean().required(),
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    const onlineValue = online ? 'online' : 'offline';

    await DeliveryBoy.updateOne({ _id: req.deliveryBoy._id }, {
        $set: { 
            'stats.online': req.body.online,
            shifts: {
                time: new Date(),
                method: onlineValue,
            }
        }
    });

    res.status(200).send(__.success('Online value set.'));
};

const allocationResponse = async (req, res) => {
    const error = __.validate(req.body, {
        orderId: Joi.string().required(),
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    const deliveryBoy = await DeliveryBoy.findOneAndUpdate({ _id: req.deliveryBoy._id }, {
        $set: { 
            currentDelivery: req.body.orderId,
        },
        $push: { delivery: req.body.orderId, }
    });

    await Order.updateIne({ _id: req.body.orderId }, {
        $set: {
            deliveryBoy: {
                id: req.deliveryBoy._id,
                token: deliveryBoy.token,
                number: deliveryBoy.credebtial.phoneNumber
            },
            timing: { pickup: new Date() },
            status: status.ORDER_PICKED,
        }
    });

    res.status(200).send(__.success(''));
};

const location = async (req, res) => {
    const error = __.validate(req.body, {
        lat: Joi.number().precision(8).min(-90).max(90).required(),
        lng: Joi.number().precision(8).min(-180).max(180).required(),
    });
    if (error) return res.status(400).send(__.error(erro.details[0].send));

    await DeliveryBoy.updateOne({ _id: req.deliveryBoy._id }, {
        $set: {
            geolocation: {
                type: 'Point',
                coordinates: [ req.body.lng, req.body.lat ]
            }
        }
    });

    res.status(200).send(__.success('Location updated.'));
}

const deliverOrder = async (req, res) => {
    const error = __.validate(req.body, {
        orderId: Joi.string().required(),
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    await Order.updateOne({ _id: req.body.orderId }, {
        $set: {
            timing: { delivery: __.getCurrentDateTime() },
            status: status.ORDER_DELIVERED,
        }
    });

    const { currentDelivery } = await DeliveryBoy.findOneAndUpdate({ _id: req.deliveryBoy._id }, {
        $pull: { currentDelivery: req.body.orderId }
    }, { fields: { currentDelivery: 1 } });

    if (currentDelivery.length == 0) {
        await DeliveryBoy.updateOne({ _id: req.deliveryBoy._id }, {
            $set: { 'status.order': false }
        });
    }
    
    res.status(200).send(__.success('Order delivered'));
};

const deliverRestaurantOrder = async (req, res) => {
    const error = __.validate(req.body, {
        orderId: Joi.string().required(),
    });
    if (error) return res.statsu(400).send(__.error(error.details[0].message));

    const { inventory } = await Order.findOneAndUpdate({ _id: req.body.orderId }, {
        $set: {
            timing: { delivery: __.getCurrentDateTime() },
            status: status.ORDER_DELIVERED,
        }
    }, {
        fields: { inventory: 1 }
    });

    await DeliveryBoy.updateOne({ _id: req.deliveryBoy._id }, {
        $set: { 
            'status.order': false,
            currentDelivery: null,
        }
    });

    await Inventory.updateOne({ _id: inventory.id }, {
        $pull: { restaurantOrders: req.body.orderId }
    });

    res.status(200).send(__.success('Order delivered.'));
};

router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);
router.post('/online', online);
router.post('/allocationResponse', allocationResponse);
router.post('/location', location);
router.post('/deliverOrder', deliverOrder);
router.post('/deliverRestaurantOrder', deliverRestaurantOrder);

module.exports = router;