const validator = require('validator');

module.exports = class ValidatorCtrl{
	
	constructor() {	

		this.schema;
		this.reqParams;
	}

	getObjValidator(){
		return validator;
	}

	valid(schema, reqParams){

		this.schema = schema;
		this.reqParams = reqParams;

		let validInfo = {
			'errorSt': false,
			'rawVal': {},
			'val': {},
			'error': {},
		};

		for(let key in this.schema){

			if(reqParams[key] === undefined)
				throw new Error(`${reqParams[key]} : this parameter is not defined`);
			else
				validInfo = this.runValid(key, validInfo);
		}

		this.schema = null;
		this.reqParams = null;

		return validInfo;
	}

	runValid(key, validInfo){

		let error;
		let valid = this.schema[key]['valid'];
		let params = this.schema[key]['params'];
		let sanitizer = this.schema[key]['sanitizer'] || null;

		if(!(params instanceof Array) && params != null)
			throw new Error(`The params of ${key} must be type Array`);

		if( params == null ){
			error = validator[valid](this.reqParams[key]);
		}else{
			error = validator[valid](this.reqParams[key], ...params);
		}

		if(error){
			
			let filtVal = this.filterInput(key, this.reqParams[key], sanitizer);

			validInfo['rawVal'][key] = this.reqParams[key];
			validInfo['val'][key] = filtVal;

		}else{

			validInfo['errorSt'] = true;
			validInfo['error'][key] = this.schema[key]['error'];
			validInfo['rawVal'][key] = this.reqParams[key];
		}

		return validInfo;
	}

	filterInput(key, inputVal, sanitizer = null){
		
		if(!(sanitizer instanceof Array) && sanitizer != null){

			throw new Error(`The sanitizer of ${key} must be type Array`);

		}else if(sanitizer === null){

			inputVal = validator.trim(inputVal);
			inputVal = validator.escape(inputVal);
		}else{
			for(let sanitVal of sanitizer){

				if (sanitVal.params instanceof Array)
					inputVal = validator[sanitVal.func](inputVal, ...sanitVal.params);
				else
					inputVal = validator[sanitVal.func](inputVal);
			}
		}
		
		return inputVal;
	}


}