const express = require('express');
const bcrypt = require('bcrypt');
const nexmo = require('nexmo');
const Joi = require('joi');
const randomatic = require('randomatic');
const __ = require('./apiUtil');
const User = require('../schema/User');
const Order = require('../schema/Order');
const Inventory = require('../schema/Inventory');
const status = require('./status');
const auth = require('../middleware/auth');

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
        async (error, responseData) => {
            if (error) return res.status(503).send(__.error('Server error. Please Retry.'));
            else {
                console.log(responseData);
                const newUser = new User({
                    phoneNumber: req.body.number,
                    verificationCode: code,
                });
                await newUser.save();

                const authToken = newUser.generateAuthToken();
                res.header('x-user-auth-token', authToken)
                    .status(200)
                    .send(__.success('Account created.'));
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
        async (error, responseDate) => {
            if (error) return res.status(503).send(__.error('Server error. Please Retry.'));
            else {
                console.log(responseDate);
                await User.updateOne({ _id: req.user._id }, {
                    $set: { verificationCode: code }
                });
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

    let isVerified = false;
    const { verificationCode } = await User.findOne({ _id: req.user._id }, 'verificationCode');
    if (req.body.code === verificationCode) {
        await User.updateOne({ _id: req.user._id }, {
            $unset: { verificationCode: 1 }
        });
        isVerified = true;
    }

    res.status(200).send(__.success(isVerified));
};

const password = async (req, res) => {
    const error = __.validate(req.body, {
        deviceId: Joi.string().required(),
        token: Joi.string().required(),
        password: Joi.string().required(),
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);

    await User.updateOne({ _id: req.user._id }, {
        $set: { 
            deviceId: req.body.deviceId,
            token: req.body.token,
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

const addSecondNumber = async (req, res) => {
    const error = __.validate(req.body, {
        number: Joi.string().required(),
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    await User.updateOne({ _id: req.user._id }, {
        $set: { secondPhoneNumber: req.body.number }
    });
    
    res.status(200).send(__.success('Phone number added.'));
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

    let user = await User.findOne({ phoneNumber: req.body.phoneNumber }, 'password');
    if (!user) return res.status(400).send(__.error('The phone number is not registered'));

    const validPassword = await bcrypt.compare(req.body.password, user.password);
    if (!validPassword) return res.status(400).send(__.error('Invalid password'));

    await User.updateOne({ _id: user._id }, {
        $set: { token: req.body.token }
    });

    const authToken = user.generateAuthToken();
    res.header('x-user-auth-token', authToken)
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

const label = async (req, res) => {
    const error = __.validate(req.body, {
        name: Joi.string().required(),
        address: Joi.object({
            line: Joi.string().required(),
            state: Joi.string().required(),
            city: Joi.string().required(),
            zip: Joi.string().required(),
        }),
        location: Joi.object({
            type: Joi.string().required(),
            coordinates: Joi.array(Joi.number()).required(),
        }),
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    await User.updateOne({ _id: req.user._id }, {
        $push: {
            label: {
                name: req.body.name,
                address: req.body.address,
                location: req.body.location,
            }
        }
    });

    res.status(200).send(__.success('Label added.'))
};

const order = async (req, res) => {
    const error = __.validate(req.body, {
        labelName: Joi.string().required(),
        totalPrice: Joi.number().required(),
        order: Joi.object({
            productId: Joi.string().required(),
            quantity: Joi.number().required(),
            unit: Joi.number().required(),
        }),
        preorderDate: Joi.object({
            year: Joi.number().min(new Date().getFullYear()).required(),
            month: Joi.number().min(0).max(12).required(),
            day: Joi.number().min(0).max(31).required(),
        }),
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));
    
    const user = await User.findOne({ _id: req.user._id }, 
        'phoneNumber token label');

    const label = user.label.filter(e => { return e.name == req.body.lebelName })
    const nearestInventory = await Inventory.findOne({
        geolocation: {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates: label.location.coordinates,
                },
                $maxDistance: 10000 // 10km
            },
        },
    }, '_id online');

    let deliveryDate;
    if (req.body.preorderDate != null) 
        deliveryDate = req.body.preorderDate;
    else {
        let currentDate = __.getCurrentDate();
        if (nearestInventory.online) deliveryDate = currentDate;
        else deliveryDate = __.getNextDay(currentDate);
    }
    
    let onlineToken;
    for (let i = 0; i < nearestInventory.token.length; i++) {
        if (nearestInventory.token[i].online) {
            onlineToken = nearestInventory.token[i].value;
            break;
        }
    }

    let order = new Order({
        user: {
            id: req.user._id,
            token: user.token,
            number: user.phoneNumber
        },
        inventory: {
            id: nearestInventory._id,
        },
        deliveryDate: deliveryDate,
        stats: {
            totalPrice: req.body.totalPrice,
            item: req.body.order,
        },
        userAddress: label,   
        timing: {
            book: __.getCurrentDateTime(),
        },
        status: status.USER_BOOKED,
    });
    await order.save();

    await User.updateOne({ _id: req.user._id }, {
        $set: { currentOrder: order._id },
        $push: { orders: order._id },
    });

    const updateObj = {};
    updateObj['currentOrders.' + __.toStringDate(deliveryDate)] = order._id;
    await Inventory.updateOne({ _id: nearestInventory._id }, {
        $push: updateObj,
    });

    if (__.isToday(deliveryDate)) {
        __.sendNotification({
            data: {
                status: status.USER_BOOKED,
                order: order + ''
            },
            token: onlineToken,
        });
    }
    
    res.status(200).send(__.success(order._id));
};

const resetDeliveryDate = async (req, res) => {
    const error = __.validate(req.body, {
        orderId: Joi.string().required(),
        prviousOrderDate: Joi.object({
            year: Joi.number().min(new Date().getFullYear()).required(),
            month: Joi.number().min(0).max(12).required(),
            day: Joi.number().min(0).max(31).required(),
        }),
        preorderDate: Joi.object({
            year: Joi.number().min(new Date().getFullYear()).required(),
            month: Joi.number().min(0).max(12).required(),
            day: Joi.number().min(0).max(31).required(),
        })
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    const order = await Order.findOneAndUpdate({ _id: req.body.orderId }, {
        $set: { deliveryDate: req.body.preorderDate }
    });

    const pushUpdate = {}, pullUpdate = {};
    pushUpdate['currentOrders.' + __.toStringDate(req.body.preorderDate)] = req.body.orderId;
    pullUpdate['currentOrders.' + __.toStringDate(req.body.prviousOrderDate)] = req.body.orderId;
    await Inventory.updateOne({ _id: order.inventory.id }, {
        $push: pushUpdate,
        $pull: pullUpdate,
    });

    res.status(200).send(__.success('Delivery Date set.'));
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

    const pullUpdate = {};
    pullUpdate['currentOrders.' + __.toStringDate(order.deliveryDate)] = order._id;
    await Inventory.updateOne({ _id: order.inventory.id }, {
        $push: { cancelOrders: req.body.orderId, },
        $pull: pullUpdate,
    })

    await User.updateOne({ _id: req.user._id }, {
        $push: { cancelOrders: req.body.orderId },
        $inc: { 'stats.cencelOrder': 1 },
    });

    __.sendNotification({
        data: { status: status.USER_CANCELLED },
        token: order.inventory.token,
    });
};

const getInventoryOnlineStatus = async (req, res) => {
    const error = __.validate(req.body, {
        inventoryId: Joi.string().required(),
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    const { online } = await Inventory.findOne({ _id: req.body.inventoryId }, 'online');
    res.status(200).send(__.success(online));
}

router.post('/registerNumber', registerNumber);
router.post('/resendVerificationCode', rsendVerificationCode);
router.post('/verifyNumber', verifyNumber);
router.post('/password', password);
router.post('/profile', auth, profile);
router.post('/addSecondPhoneNumber', addSecondNumber);
router.post('/signup', signup);
router.post('/login', login);
router.post('/checkDeviceId', checkDeviceId);
router.post('/token', token);
router.post('/label', auth, label);
router.post('/order', auth, order);
router.post('/resetDeliveryDate', auth, resetDeliveryDate);
router.post('/cancelOrder', auth, cancelOrder);
router.post('/getInventoryOnlineStatus', auth, getInventoryOnlineStatus);

module.exports = router;