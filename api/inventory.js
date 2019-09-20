const express = require('express');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const Joi = require('joi');
const _ = require('lodash');
const __ = require('./apiUtil');
const User = require('../schema/User');
const Order = require('../schema/Order');
const Inventory = require('../schema/Inventory');
const status = require('./status');

const router = express.Router();

const signup = async (req, res) => {
    const error = __.validate(req.body, {
        token: Joi.string().required(),
        email: Joi.string().email().required(),
        password: Joi.string().required(),
        address: Joi.object({
            line: Joi.string().required(),
            state: Joi.string().required(),
            city: Joi.string().required(),
            zip: Joi.string().required(),
        }),
        lat: Joi.number().precision(8).min(-90).max(90).required(),
        lng: Joi.number().precision(8).min(-180).max(180).required(),
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    let inventory = await Inventory.findOne({ email: req.body.email });
    if (inventory) return res.status(400).send(__.error('Email already registered.'));

    inventory = {
        token: [ req.body.token ],
        password: req.body.password,
        email: req.body.email,
        address: req.body.address,
        location: {
            type: 'Point',
            coordinates: [ req.body.lng, req.body.lat ],
        }
    };

    const salt = await bcrypt.genSalt(10);
    inventory.password = await bcrypt.hash(inventory.password, salt);

    const newInventory = new Inventory(inventory);
    await newInventory.save();
    const token = newInventory.generateAuthToken();

    res.header('x-inventory-auth-token', token)
       .status(200)
       .send(__.success('Signed up.'));
};

const login = async (req, res) => {
    const error = __.validate(req.body, {
        email: Joi.string().required(),
        password: Joi.string().required(),
        token: Joi.string().required(),
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    let inventory = await Inventory.findOne({ email: req.body.email });
    if (!inventory) return res.status(400).send(__.error('Invalid email or password'));

    const validPassword = await bcrypt.compare(req.body.password, inventory.password);
    if (!validPassword) return res.status(400).send(__.error('Invalid password'));

    await Inventory.updateOne({ _id: inventory._id }, {
        $set: { token: req.body.token }
    });

    const token = inventory.generateAuthToken();
    res.header('x-inventory-auth-token', token)
       .status(200)
       .send(__.success('Loged in.'));
}; 

const token = async (req, res) => {
    const error = __.validate(req.body, {
        token: Joi.string().required(),
    });
    if (error) return res.status(200).send(__.error(error.details[0].message));

    await Inventory.updateOne({ _id: req.inventory._id }, {
        $set: { token: req.body.token }
    });

    res.status(200).send(__.success('Token updated'));
};

const allocateDeliveryBoy = async (req, res) => {
    const error = __.validate({
        orderId: Joi.string().required(),
        uid: Joi.string().required(),
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    const deliveryBoy = await DeliveryBoy.findOneAndUpdate({ uid: req.body.uid }, {
        $set: { currentDelivery: req.body.orderId },
        $push: { delivery: req.body.orderId }
    });

    await Order.updateOne({ _id: req.body.orderId }, {
        $set: {
            deliveryBoy: {
                id: deliveryBoy._id,
                token: deliveryBoy.token,
                number: deliveryBoy.phoneNumber,
            },
            status: status.ORDER_PICKED,
            timing: { pickuo: new Date() },

        }
    });

    __.sendNotification({
        data: {
            status: status.ORDER_DEPLOYED,
            order: order + '',
        },
        token: deliveryBoy.token,
    });

    res.status(200).send(__.success('Order allocated.'))
};

router.post('./signup', signup);
router.post('./login', login);
router.post('./token', token);
router.post('./allocateDeliveryBoy', allocateDeliveryBoy);

module.exports = router;