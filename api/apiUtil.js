const Joi = require('joi');
const admin = require('firebase-admin');
const _ = require('lodash');

const error = (msg) => {
    return {
        status: 'error',
        msg: msg
    };
};

const success = (data) => {
    return {
        status: 'success',
        data: data
    };
};

const sendNotification = async (message) => {
    await admin.messaging().send(message)
        .then(response => {
            console.log(response);
        }).catch(error => {
            console.log(error);
        });
};

const validate = (data, schemaObject) => {
    const schema = Joi.object().keys(schemaObject);

    const { error } = Joi.validate(data, schema, {
        abortEarly: true, 
        convert: true,
        allowUnknown: true
    });
    
    return error;
};

const getCurrentDateTime = () => {
    const dateTime = new Date();

    const year = dateTime.getFullYear();
    const month = dateTime.getMonth();
    const day = dateTime.getDate();
    const hour = dateTime.getHours();
    const minute = dateTime.getMinutes();
    const second = dateTime.getSeconds();
    const timestamp = dateTime.getTime();

    const currentDateTime = {
        year, month, day, hour, minute, second, timestamp
    }
    return currentDateTime;
}

const getCurrentDate = () => {
    const dateTime = new Date();

    const year = dateTime.getFullYear();
    const month = dateTime.getMonth();
    const day = dateTime.getDate();

    const currentTime = {
        year, month, day, 
        hour: null,
        minute: null,
        second: null,
    };
    return currentTime;
}

const toStringDate = (date) => {
    return date.year + '-' + date.month + '-' + date.day;
}

const getNextDay = (currentDay) => {
    const currentDate = new Date(
        currentDay.year,
        currentDay.month, 
        currentDay.day,
    );
    const nextDayDate = new Date();
    nextDayDate.setDate(currentDate.getDate() + 1);

    return nextDayDate;
};

const isToday = (date) => {
    return _.isEqual(getCurrentDate, date);
}

module.exports = {
    error, 
    success,
    sendNotification,
    validate,
    getCurrentDateTime,
    toStringDate,
    getCurrentDate,
    getNextDay,
    isToday,
};