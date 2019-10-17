const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const helmet = require('helmet');
const mongoose = require('mongoose');
const admin = require('firebase-admin');
const config = require('config');
const cors = require('cors');
const ip = require('ip');

const app = express();

// firebase connection and authentication file
var serviceAccount = require("./serviceAccountKey.json");

// checking if all the environment variables are set
const userAuthToken = config.get('userAuthToken');
const inventoryAuthToken = config.get('inventoryAuthToken');
const deliveryBoyAuthToken = config.get('deliveryBoyAuthToken');

if (userAuthToken == null || inventoryAuthToken == null || 
    deliveryBoyAuthToken == null) {
    console.log('FATAL ERROR: one or more auth token not set.');
    process.exit(1); // 1 is the error code
}

// initializing firebase
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const env = app.get('env');
const ipAddress = ip.address();
console.log(`Trying to start Meat server at ${ipAddress} (in ${env} mode)...`);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

if (env == 'development') {
    app.use(morgan('tiny'));
}

if (env == 'production') {
    app.use(morgan('tiny'));
    app.use(helmet());
}

const userApi = require('./api/user');
const inventoryApi = require('./api/inventory');
const deliveryBoyApi = require('./api/deliveryBoy');
const productApi = require('./api/product');

app.use('/api/user', userApi);
app.use('/api/inventory', inventoryApi);
app.use('/api/deliveryBoy', deliveryBoyApi);
app.use('/api/product', productApi);

// connecting to the mongoDB Atlas cloud storage
const dbUrl = config.get('db');
console.log(`Trying to connect to mongodb ${dbUrl}`);

const mongoDbConfig = {
    useNewUrlParser: true,
    useCreateIndex: true,
};

mongoose.connect(dbUrl,  mongoDbConfig)
    .then(() => console.log('Connected to mongodb.'))
    .catch(err => console.log('Could not connect to mongodb.', err));

// starting the server
const port = process.env.PORT || config.get('server.port');
app.listen(port, () => {
    console.log(`Listining to port ${port}`);
});