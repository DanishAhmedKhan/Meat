const express = require('express');
const bcrypt = require('bcrypt');
const Joi = require('joi');
const nodemailer = require('nodemailer');
const __ = require('./apiUtil');
const Restaurant = require('../schema/Restaurant');
const Order = require('../schema/Order');
const Inventory = require('../schema/Inventory');
const status = require('./status');

const router = express.Router();

const signup = async (req, res) => {
    const error = __.validate(req.body, {
        token: Joi.string().required(),
        name: Joi.string().required(),
        email: Joi.string().email().required(),
        password: Joi.string().required(),
        phoneNumber: Joi.string().required(),
        meatServed: Joi.array().items(Joi.string()),
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    const restaurant = await Restaurant.findOne({ email: req.body.email });
    if (restaurant) return res.status(400).send(__.error('Account with this email already exist.'));

    let restaurant = {
        token: req.body.token,
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        phoneNumber: req.body.phoneNumber,
        meatServed: req.body.meatServed,
    };

    const salt = await bcrypt.genSalt(10);
    restaurant.password = await bcrypt.hash(restaurant.password, salt);

    const newRestaurant = new Restaurant(restaurant);
    await newRestaurant.save();
    const authToken = newRestaurant.generateAuthToken();

    // Sending account createion mail
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'khand3826@gmail.com',
          pass: '***********'
        }
    });
      
    var mailOptions = {
        from: 'khand3826@gmail.com',
        to: req.body.email,
        subject: 'Account Verification',
        text: 'You have successfully created yout account in Meat.'
    };
      
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log(error);
        } else {
          console.log('Email sent: ' + info.response);
        }
    });

    res.header('x-restaurant-auth-token', authToken)
        .status(200)
        .send(__.success('Signed up.'));
};

const login = async (req, res) => {
    const error = __.validate(req.body, {
        token: Joi.string().required(),
        email: Joi.string().email().required(),
        password: Joi.string().required(),
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    const restaurant = await Restaurant.findOne({ _id: req.body.email });
    if (!restaurant) return res.status(400).send(__.error('Invalid email or password.'));

    const validPassword = await bcrypt.compare(req.body.password, restaurant.password);
    if (!validPassword) return res.status(400).send(__.error('Invalid email or password'));

    await Restaurant.updateOne({ _id: restaurant._id }, {
        $set: { token: req.body.token }
    });
    const authToken = restaurant.generateAuthToken();

    res.header('x-restaurant-auth-token', authToken)
        .status(200)
        .send(__.success('Logged in.'));
};

const token = async (req, res) => {
    const error = __.validate(req.body, {
        token: Joi.string().required(),
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    await Restaurant.updateOne({ _id: req.restaurant._id }, {
        $set: { token: req.body.token }
    });

    res.status(200).send(__.success('Token updated.'));
}

const order = async (req, res) => {
    const error = __.validate(req.body, {
        
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));


};

const cancelOrder = async (req, res) => {
    const error = __.validate(req.body, {
        orderId: Joi.string().required(),
    });
    if (error) return res.status(__.error(error.details[0].message));

    
};

router.post('/signup', signup);
router.post('/login', login);
router.post('/token', token);
router.post('/order', order);
router.post('/cancelOrder', cancelOrder);

module.exports = router;