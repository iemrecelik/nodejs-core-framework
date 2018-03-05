const path = require('path');
    
const defined = require(path.join(__dirname, '/config/defined.js'))
global.__defined = new defined(__dirname);

const flash = require('connect-flash')
    , express = require('express')
    , session = require('express-session')
    , cookie = require('cookie')
    , cookieParser = require('cookie-parser')
    , bodyParser = require('body-parser')
    , app = express()
    , nunjucks = require('nunjucks')
    , mongoDB = require(path.join(__defined.baseUrl , '/config/MongoDBConn.js'))
    , sessionStore = new session.MemoryStore({ reapInterval: 60000 * 10 })
    , SocketManager = require(path.join(__defined.moduleUrl, '/Sockets/SocketManager.js'));

global.Controller = require(__defined.baseUrl + 'system/controller/Controller.js');

const server = app.listen('3000', function() {
    console.log('Application run like success : ' + new Date());
});

app.io = require('socket.io')(server);

const socketNeedVals = {
    cookie: cookie,
    cookieParser: cookieParser,
    sessionStore: sessionStore,
    io: app.io,
}
SocketManager(socketNeedVals);

app.use(session({
    secret: 'ADb-CDE-pODs',
    resave: false,
    saveUninitialized: true,
    // cookie: { maxAge: 60000 }
    cookie: {},
    name: 'session.sid',
    store: sessionStore,
}));
app.use(cookieParser('cVr-TYDE-pO8Ds'));
app.use(flash());
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use('/public', express.static(path.join(__dirname, 'public')))

/* Nunjucks Configure Start */
app.set('view engine', 'html.njk');

nunjucks.configure(path.join(__defined.moduleUrl, 'View'), {
    autoescape: true,
    express: app
});
/* Nunjucks Configure End */

const routeManager = require(path.join(__defined.moduleUrl , '/Route/RouteManager.js'));

app.use(routeManager);