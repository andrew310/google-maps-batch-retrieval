// app/routes.js
var xls = require('excel'); //load excel


function convertToJSON(array) {
  var first = array[0].join()
  var headers = first.split(',');
  
  var jsonData = [];
  for ( var i = 1, length = array.length; i < length; i++ )
  {
   
    var myRow = array[i].join();
    var row = myRow.split(',');
    
    var data = {};
    for ( var x = 0; x < row.length; x++ )
    {
      data[headers[x]] = row[x];
    }
    jsonData.push(data);

  }
  return jsonData;
};


module.exports = function(app, passport) {
	var fs = require('fs-extra'); //File System - for file manipulation


	/**
	 * HOME PAGE
	 */
	app.get('/', function(req, res) {
		res.render('index.handlebars');
	});

	app.get('/xlsx', function(req, res) {
		// render the page and pass in any flash data if it exists
		res.render('xlsx.handlebars');
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
	app.post('/endpoints/getImages', function(req, res, next) {
		var fstream;
		var stuff;
		req.pipe(req.busboy);
		req.busboy.on('file', function (fieldname, file, filename) {
			console.log("Uploading: " + filename);
			//path is parent folder and then public/csv
			fstream = fs.createWriteStream(__dirname + '/../public/uploads/' + filename);
			file.pipe(fstream);
			fstream.on('close', function () {
				console.log("Upload Finished of " + filename);
			});
			xls(__dirname + '/../public/uploads/' + filename, function(err, data) {
  				if(err) throw err;
    			var stuff = convertToJSON(data);

				fs.exists(__dirname + '/../public/uploads/' + filename, function(exists) {
				  if(exists) {
				    //Show in green
				    console.log('File exists. Deleting now ...');
				    fs.unlink(__dirname + '/../public/uploads/' + filename);
				  } else {
				    //Show in red
				    console.log('File not found, so not deleting.');
				  }
				});

    			//res.type('text/plain');
				res.render('property.handlebars', {
					stuff // get the user out of session and pass to template
				});
			});
		});

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
