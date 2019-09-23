const Joi = require('joi');
const admin = require('firebase-admin');

module.exports.error = (msg) => {
    return {
        status: 'error',
        msg: msg
    };
};

module.exports.success = (data) => {
    return {
        status: 'success',
        data: data
    };
};

module.exports.sendNotification = async (message) => {
    await admin.messaging().send(message)
        .then(response => {
            console.log(response);
        }).catch(error => {
            console.log(error);
        });
};

module.exports.validate = (data, schemaObject) => {
    const schema = Joi.object().keys(schemaObject);

    const { error } = Joi.validate(data, schema, {
        abortEarly: true, 
        convert: true,
        allowUnknown: true
    });
    
    return error;
};

module.exports.getCurrentDateTime = () => {
    const dateTime = new Date();

    const year = dateTime.getFullYear();
    const month = dateTime.getMonth();
    const day = dateTime.getDate();
    const hour = dateTime.getHours();
    const minute = dateTime.getMinutes();
    const second = dateTime.getSeconds();
    const timestamp = dateTime.getTime();

    const currentDateTime = {
        year, month, fay, hour, minute, second, timestamp
    }
    return currentDateTime;
}

module.exports.getCurrentDate = () => {
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

module.exports.getNextDay = (currentDay) => {
    const currentDate = new Date(
        currentDay.year,
        currentDay.month, 
        currentDay.day,
    );
    const nextDayDate = new Date();
    nextDayDate.setDate(currentDate.getDate() + 1);

    return nextDayDate;
};