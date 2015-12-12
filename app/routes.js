// app/routes.js
module.exports = function(app, passport) {
	var fs = require('fs-extra');       //File System - for file manipulation

	/**
	 * HOME PAGE
	 */
	app.get('/', function(req, res) {
		res.render('index.handlebars');
	});

	/**
	 * LOGIN
	 * get request to login url just renders the template with a login form
	 */
	app.get('/login', function(req, res) {
		// render the page and pass in any flash data if it exists
		res.render('login.handlebars', { message: req.flash('loginMessage') });
	});

	// post request to login url will process form inputs
	app.post('/login', passport.authenticate('local-login', {
            successRedirect : '/profile', // redirect to the secure profile section
            failureRedirect : '/login', // redirect back to the signup page if there is an error
            failureFlash : true // allow flash messages
		}),
        function(req, res) {
            console.log("hello");

            if (req.body.remember) {
              req.session.cookie.maxAge = 1000 * 60 * 3;
            } else {
              req.session.cookie.expires = false;
            }
        res.redirect('/');
    });

	/**
	 * SIGNUP
	 */
	app.get('/signup', function(req, res) {
		res.render('signup.handlebars', { message: req.flash('signupMessage') });
	});

	app.post('/signup', passport.authenticate('local-signup', {
		successRedirect : '/profile', // redirect to the secure profile section
		failureRedirect : '/signup', // redirect back to the signup page if there is an error
		failureFlash : true // allow flash messages
	}));

	/**
	 * PROFILE
	 */
	//cannot access unless logged in, which is verified by isLoggedIn function
	app.get('/profile', isLoggedIn, function(req, res) {
		res.render('profile.handlebars', {
			user : req.user // get the user out of session and pass to template
		});
	});

	/**
	 * LOGOUT
	 */
	app.get('/logout', function(req, res) {
		req.logout();
		res.redirect('/');
	});

	/**
	 * FILE UPLOAD
	 * nb: it does not have to be a csv, this should process any file upload
	 */
	app.post('/endpoints/csv', function(req, res, next) {
		var fstream;
		req.pipe(req.busboy);
		req.busboy.on('file', function (fieldname, file, filename) {
			console.log("Uploading: " + filename);
			//path is parent folder and then public/csv
			fstream = fs.createWriteStream(__dirname + '/../public/csv/' + filename);
			file.pipe(fstream);
			fstream.on('close', function () {
				console.log("Upload Finished of " + filename);
			});
		});
		res.type('text/plain');
		res.send('done');
	});
};

// route middleware to make sure
function isLoggedIn(req, res, next) {
	// if user is authenticated in the session, carry on
	if (req.isAuthenticated())
		return next();
	// if they aren't redirect them to the home page
	res.redirect('/');
}
