module.exports = function(dirname){
	
	this.baseUrl = dirname + '/';
	this.moduleName = 'userModule';
	this.moduleUrl = this.baseUrl + 'modules/' + this.moduleName + '/';

	this.errorHandle = function(req, res, next){
    	
		res.status(404);

	    if (req.accepts('html'))
	        res.render('error.html.njk', { url: req.url });// respond with html page
	    else if (req.accepts('json'))
	    	res.send({ error: 'Not found' });// respond with json
	   	else
	    	res.type('txt').send('Not found');// default to plain-text. send()
	}
}
