const express = require('express');
const bcrypt = require('bcrypt');
const Joi = require('joi');
const Product = require('../schema/Product');
const auth = require('../middleware/auth');

const router = express.Router();

const newProduct = async (req, res) => {
    const error = __.validate(req.body, {
        type: Joi.string().required(),
        name: Joi.string().required(),
        price: Joi.object({
            value: Joi.number().required(),
            quantity: Joi.number().required(),
        }),
        description: Joi.string().required(),
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    const newProduct = new Product({
        type: req.body.type,
        name: req.body.name,
        price: req.body,price,
        description: req.body.description,
    });
    await newProduct.save();

    res.status(200).send(__.success('Product added.'));
};

const changePrice = async (req, res) => {
    const error = __.validate(req.body, {
        productId: Joi.string().required(),
        price: Joi.object({
            value: Joi.number().required(),
            quantity: Joi.number().required(),
        }),
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    await Product.updateOne({ _id: req.body.productId }, {
        $set: { price: req.body.price }
    });

    res.status(200).send(__.success('Price updated.'));
};

const product = async (req, res) => {
    const allProducts = await Product.findAll({});
    res.status(200).send(__.success(allProducts));
};

const productByType = async (req, res) => {
    const error = __validate(req.body, {
        type: Joi.string().required(),
    });
    if (error) return res.status(400).send(__.error(error.details[0].message));

    const allProducts = await Product.findAll({ type: req.body.type });
    res.status(200).send(__.success(allProducts));
};

router.post('/newProduct', newProduct);
router.post('/changePrice', changePrice);
router.post('/product', product);
router.post('/productByType', productByType);

module.exports = router;