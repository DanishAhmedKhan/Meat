const express = require('express');
const bcrypt = require('bcrypt');
const Joi = require('joi');
const _ = require('lodash');
const __ = require('./apiUtil');
const Order = require('../schema/Order');
const Inventory = require('../schema/Inventory');
const Product = require('../schema/Product');
const status = require('./status');

const router = express.Router();

const signup = async (req, res) => {
    const error = __.validate(req.body, {
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
        $set: {
            token: {
                value: req.body.token,
                online: false,
            }
        }
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
        $set: {
            token: {
                value: req.body.token,
                online: false,
            }
        }
    });

    res.status(200).send(__.success('Token updated'));
};

const online = async (req, res) => {
    const error = __.validate(req.body, {
        token: Joi.string().required(),
    });
    if (error) return res.status(400).send(__.success(error.details[0].message));

    const inventory = await Inventory.findOne({ _id: req.inventory._id }, 'token');

    let currentOnlineIndex, newOnlineIndex;
    for (let i = 0; i < inventory.token.length; i++) {
        if (inventory.token[i].online === true)
            currentOnlineToken = i;
        if (inventory.token[i].token === req.body.token)
            newOnlineToken = i;
    }

    const newToken = inventory.token;
    newToken[currentOnlineIndex].online = false;
    newToken[newOnlineIndex].online = true;

    await Inventory.updateOne({ _id: req.inventory._id }, {
        $set: { 
            token: newToken,
            online: true, 
        }
    });

    __.sendNotification({
        data: {
            status: status.GO_OFFLINE,
        },
        token: inventory.token[currentOnlineIndex].token,
    });

    res.status(200).send(__.success('Ste online.'));
};

const offline = async (req, res) => {
    const error = __.validate(req.body, {
        token: Joi.string().required(),
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    await Inventory.updateOne({
        _id: req.inventory._id,
        'token.value': req.body.token, 
    }, {
        $set: { 
            'token.$.online': false,
            online: false,
        }
    });

    res.status(200).send(__.success('Set offline.'));
};

const addHelplineNumber = async (req, res) => {
    const error = __.validate(req.body, {
        number: Joi.string().required(),
    });
    if (error) return res.status(200).send(__.error(error.details[0].message));

    await Inventory.updateOne({ _id: req.inventory._id }, {
        $push: { helplineNumbers: req.body.number }
    });

    res.status(200).send(__.success('Helpline number added.'));
};

const allocateDeliveryBoy = async (req, res) => {
    const error = __.validate({
        orderIds: Joi.array(Joi.string()),
        uid: Joi.string().required(),
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    const deliveryBoy = await DeliveryBoy.findOneAndUpdate({ uid: req.body.uid }, {
        $set: { currentDelivery: req.body.orderIds },
        $push: {
            delivery: { $each: req.body.orderIds }
        }
    });

    await Order.updateOne({ _id: req.body.orderId }, {
        $set: {
            deliveryBoy: {
                id: deliveryBoy._id,
                token: deliveryBoy.token,
                number: deliveryBoy.phoneNumber,
            },
            status: status.ORDER_PICKED,
            timing: { pickup: __.getCurrentDateTime() },

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

const getRestaurantOrders = async (req, res) => {
    const error = __.validate(req.body, {
        date: Joi.object({
            year: Joi.string().required(),
            month: Joi.string().required(),
            day: Joi.string().required(),
        }),
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    const { restaurantOrders } = await Inventory.findOne({ _id: req.inventory._id }, 
        'restaurantOrders');

    let allProductDetails = [], product;
    let products = await Product.findAll();
    for (let i = 0; i < products.length; i++) {
        product = {
            _id: products[i]._id,
            name: products[i].name,
            type: products[i].type,
            price: products[i].price,
            totalOrderWeight: 0,
            totalOrderCost: 0,
        };
        allProductDetails[i] = product;
    }

    let todaysOrder = [], order, item, k = 0, item, pos;
    for (let i = 0; i < restaurantOrders.length; i++) {
        if (_.isEqual(restaurantOrders[i].deliveryDate, req.body.date)) {
            order = await Order.findOne({ _id: restaurantOrders[i].orderId });
            todaysOrder[k++] = order;

            item = order.stats.item;
            for (let j = 0; j < item.length; j++) {
                pos = allProductDetails.map(e => { return e._id; })
                    .indexOf(item[i].productId);

                allProductDetails[pos].totalOrderWeight += item[i].quantity;
                allProductDetails[pos].totalOrderCost += order.stats.totalPrice;
            }
        }
    }

    res.status(200).send(__.success({
        todaysOrder,
        allProductDetails,
    }));
};  


router.post('./signup', signup);
router.post('./login', login);
router.post('./token', token);
router.post('./online', online);
router.post('./offline', offline);
router.post('./addHelplineNumber', addHelplineNumber);
router.post('./allocateDeliveryBoy', allocateDeliveryBoy);
router.post('./getRestaurantOrders', getRestaurantOrders);

module.exports = router;