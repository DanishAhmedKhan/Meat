const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const dateTimeSchema = new Schema({
    year: Number,
    month: Number,
    day: Number,
    hour: Number,
    minute: Number,
    second: Number,
    timestamp: Number,
});

module.exports = dateTimeSchema;