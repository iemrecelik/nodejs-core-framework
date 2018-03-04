const ConfigClass = require(__defined.baseUrl + 'system/config/configParameters.js')
const configPar = new ConfigClass().getConfigures().configParameters;

const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

const url = configPar.mongoDB.url;
var options = { 
	useMongoClient: true,
	promiseLibrary: mongoose.Promise,
};

mongoose.connect(url, options, function(err) {
    if (err)
        console.log(err);
    else
        console.log('MongoDB connection success');
});