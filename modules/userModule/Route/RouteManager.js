const ConfigClass = require(__defined.baseUrl + 'system/config/configParameters.js')
const configPar = new ConfigClass().getConfigures().configParameters;

module.exports = function(req, res, next) {

    let role = getUserRole(req);
    
    if (typeof configPar.containAuth[role] !== 'undenfined') {

        var containAuth = configPar.containAuth[role];
        var roleAuth = configPar.routeAuth[role];

        containAuth.forEach(function(auth, index) {
            roleAuth = Object.assign(roleAuth, configPar.routeAuth[auth]);
        });

    } else {
        var roleAuth = configPar.routeAuth[role];
    }

    var allRoute = req.originalUrl.match(/^\/\w+/);

    baseRoute = allRoute === null ? null : allRoute[0];
    allRoute = baseRoute === null ? null : baseRoute + '/*';

    if (typeof roleAuth[req.originalUrl] !== 'undefined') {

        const route = require('./' + roleAuth[req.originalUrl] + '.js');
        req.app.use(req.originalUrl, route);

    } else if (typeof roleAuth[allRoute] !== 'undefined') {

        const route = require('./' + roleAuth[allRoute] + '.js');
        req.app.use(baseRoute, route);

    } else {
        __defined.errorHandle(req, res, next);
        return;
        
    }
    next();
}

function getUserRole(req){
    
    let role = 'notMember';
    
    if (typeof req.session.user !== 'undefined' && req.session.uniqueID != null) {
        role =  req.session.user.role;
    }

    return role;
}