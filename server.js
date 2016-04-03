// server.js

// set up ======================================================================
var express  = require('express');
var app = express();
var mongoose = require('mongoose');
var session  = require('express-session');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var port = process.env.PORT || 8080;
var path = require('path');     //used for file path
var passport = require('passport');
var flash = require('connect-flash');
var handlebars = require('express-handlebars').create({defaultLayout:'main'});

// configuration ===============================================================
require('./config/passport')(passport); // pass passport for configuration
var configDB = require('./config/database.js');
mongoose.connect(configDB.url); // database connection pool

// set up express application
app.use(morgan('dev')); // log every request to the console
app.use(cookieParser()); // read cookies (needed for auth)
app.use(bodyParser.urlencoded({
	extended: true
}));
app.use(bodyParser.json());
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars'); //set up view engine for handlebars

// required for passport
app.use(session({
	secret: 'andrewisthebestshhh',
	resave: true,
	saveUninitialized: true
 } )); // session secret
app.use(passport.initialize());
app.use(passport.session());
app.use(flash()); // use connect-flash for flash messages stored in session

//file upload stuff
var busboy = require('connect-busboy');
app.use(express.static(path.join(__dirname, 'public'))); // serve static files in public folder
app.use(busboy());

// routes ======================================================================
require('./app/routes.js')(app, passport); // load our routes and pass in our app and fully configured passport

// launch ======================================================================
app.listen(port);
console.log('The magic happens on port ' + port);
