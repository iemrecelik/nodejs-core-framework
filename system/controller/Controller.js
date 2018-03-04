const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ConfigClass = require(__defined.baseUrl + 'system/config/configParameters.js');


module.exports = class Controller extends ConfigClass{

	constructor() {
		super();
		this.classes = {};
		this.secret = this.getParam('cryptoSecretKey');
	}

	getParam(name){
		
		if( this.parameters[name] == null ){
			throw new Error(`${name} : this parameter is not defined`);
		}
		
		return this.parameters[name];
	}

	getConfigParam(name){

		if( this.configParameters[name] == null ){
			throw new Error(`${name} : this config parameter is not defined`);
		}
			
		return this.configParameters[name];
	}

	getClass(name, values = null){

		if(this.classes[name] === undefined){

			if( this.services[name] == null )
				throw new Error(`${name} : this class name is not defined`);

			let service = this.services[name];

			const serviceClass = require(path.join(__defined.baseUrl, service['path']));

			this.classes[name] = {'class': serviceClass, 'arguments': service['arguments']}

		}

		let classData = this.classes[name];

		values = values ? values : 
			classData['arguments'] != null ? 
			classData['arguments'] : values;

		if( values )
			return new classData['class'](...values);
		else
			return new classData['class']();
	}

	getValidSchema(schemaName){

		if(this.validSchemas[schemaName] != null)
			return this.validSchemas[schemaName];
		else
			throw new Error(`${schemaName} : this schema name is not defined`);
	}

	_guid(charLength = null){

		let charLists = '';

		if(charLength){

			for(let i = 0;i < charLength; i++){
				charLists += 'x';
			}
		}else
			charLists = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
        
        let currentDateMilliseconds = new Date().getTime();

        return charLists.replace(/[xy]/g, function(currentChar) {
            let randomChar = (currentDateMilliseconds + Math.random() * 16) % 16 | 0;
            currentDateMilliseconds = Math.floor(currentDateMilliseconds / 16);
            return (currentChar === 'x' ? randomChar : (randomChar & 0x7 | 0x8)).toString(16);
        });
    }

    crypto(rawData, secret = null, encoding = 'sha256'){

    	secret = secret || this.secret;
		
		return crypto.createHmac(encoding, secret)
		                   .update(rawData)
		                   .digest('hex');
    }

    errorHandle(req, res, next){
    	
    	res.status(404);

        if (req.accepts('html'))
            res.render('error.html.njk', { url: req.url });// respond with html page
        else if (req.accepts('json'))
        	res.send({ error: 'Not found' });// respond with json
       	else
        	res.type('txt').send('Not found');// default to plain-text. send()
    }
}