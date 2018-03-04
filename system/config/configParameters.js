yaml = require('js-yaml');
fs = require('fs');
path = require('path');


module.exports = class Configure{

	constructor() {

		this.yamlFiles = {}
		this.parameters = {}
		this.configParameters = {}
		this.services = {}
		this.validSchemas = {}

		try {
			
			this.validSchemas = yaml.safeLoad(
				fs.readFileSync(path.join(__defined.baseUrl, 'config/validSchemas.yaml'), 'utf8')
			);

			// Get document, or throw exception on error
			this.yamlFiles['params'] = yaml.safeLoad(
				// fs.readFileSync(path.join(__dirname, '../../config/parameters.yaml'), 'utf8')
				fs.readFileSync(path.join(__defined.baseUrl, 'config/parameters.yaml'), 'utf8')
			);

			this.yamlFiles['sysCoParams'] = yaml.safeLoad(
				// fs.readFileSync(path.join(__dirname, 'configParameters.yaml'), 'utf8')
				fs.readFileSync(path.join(__defined.baseUrl, 'system/config/configParameters.yaml'), 'utf8')
			);

			this.yamlFiles['coParams'] = yaml.safeLoad(
				// fs.readFileSync(path.join(__dirname, '../../config/configParameters.yaml'), 'utf8')
				fs.readFileSync(path.join(__defined.baseUrl, 'config/configParameters.yaml'), 'utf8')
			);

			this.yamlFiles['sysServices'] = yaml.safeLoad(
				fs.readFileSync(path.join(__defined.baseUrl, 'system/config/services.yaml'), 'utf8')
			);

			this.yamlFiles['services'] = yaml.safeLoad(
				// fs.readFileSync(path.join(__dirname, '../../config/services.yaml'), 'utf8')
				fs.readFileSync(path.join(__defined.baseUrl, 'config/services.yaml'), 'utf8')
			);

			

			for (let paramKey in this.yamlFiles) {

				if (this.yamlFiles.hasOwnProperty(paramKey) && this.yamlFiles[paramKey] != null) {

					this.yamlFiles[paramKey] = this.joinYaml(this.yamlFiles[paramKey]);

					if (this.yamlFiles[paramKey]['parameters'] != null) {

						this.parameters = this.getParametersInFile(
							this.yamlFiles[paramKey]['parameters'], this.parameters
						);
					}

				}
			}

			this.configParameters = this.getParametersInFile(
				this.yamlFiles['coParams'], this.configParameters
			);

			
			this.services = this.getParametersInFile(
				this.yamlFiles['sysServices']['services'], this.services
			)

			this.services = this.getParametersInFile(
				this.yamlFiles['services']['services'], this.services
			)

			
			for( let serviceKey in this.services ){
				if( this.services[serviceKey]['arguments'] !== undefined && 
					!(this.services[serviceKey]['arguments'] instanceof Array))
					throw new Error('the arguments of service is not defined as type array');
			}

		} catch (e) {
			console.log(e);
		}
	}

	getParametersInFile(param, rawObj) {

		let paramString = JSON.stringify(param);

		let paramReg = /%\w+%/g;

		let regParams = paramString.match(paramReg);

		if (regParams != null) {

			let paramVar;

			for (let regParam of regParams) {

				paramVar = regParam.replace(/%/g, '')

				if (param[paramVar] != null)
					paramVar = param[paramVar];

				else if (this.parameters[paramVar] != null)
					paramVar = this.parameters[paramVar]

				else
					paramVar = null;

				if(typeof paramVar === 'string'){
					paramString = paramString.replace(new RegExp(regParam, "g"), paramVar);
				}else{
					paramVar = JSON.stringify(paramVar).replace(/^["]+|["]+$/g, '');
					paramString = paramString.replace(new RegExp('"'+regParam+'"', "g"), paramVar);
				}

				paramString = paramString.replace(new RegExp(regParam, "g"), paramVar);
			}
		}
		
		return Object.assign(rawObj, JSON.parse(paramString));
	}

	joinYaml(yamlFile) {

		let imports = yamlFile['imports'] != null ? yamlFile['imports'] : null;

		delete yamlFile['imports'];

		for (let resourceKey in imports) {

			if (imports.hasOwnProperty(resourceKey)) {

				let importFile = yaml.safeLoad(
					fs.readFileSync(path.join(__dirname, '../..', imports[resourceKey]['resources']), 'utf8')
				);

				if (yamlFile['parameters'] != null && importFile['parameters'] != null) {

					yamlFile['parameters'] = Object.assign(yamlFile['parameters'], importFile['parameters']);
				}

				yamlFile = Object.assign(importFile, yamlFile);
			}
		}

		return yamlFile;
	}

	getConfigures(){
		return {
			parameters: this.parameters,
			configParameters: this.configParameters,
			services: this.services,
			validSchemas: this.validSchemas
		}
	}

}