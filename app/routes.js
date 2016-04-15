// app/routes.js
var xls = require('excel'); //load excel
var fs = require('fs-extra'); //File System - for file manipulation
var request = require('request');
var http = require('http');
var zipFolder = require('zip-folder');
var waitUntil = require('wait-until');


function convertToJSON(array) {
  var first = array[0].join();
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
}

function countFiles(directory) {
	count = 0;
  fs.readdir(directory, function(err, files) {
  	count = files.length;
  });
  return count;
}

function compareFiles(count, count2){

	return (count==count2 ? true : false);

}

function zipUp(filepath, count){

	console.log("COUNTING:");
	console.log(compareFiles(countFiles(filepath), count));
	waitUntil()
    .interval(500)
    .times(10)
    .condition(function() {
        return (compareFiles(countFiles(filepath), count) ? true : false);
    })
    .done(function(result) {
        // do stuff
        zipFolder(filepath, './public/zips/archive.zip', function(err) {
			if(err) {
				console.log('oh no!', err);
			} else {
				console.log('EXCELLENT');
			}
		});
    });


}


//called once, loops through JSON and makes request for each address
var download = function (files, filepath){
	var count = 0;
	for(var i in files){
		var address = files[i].ADDRESS;
		var city = files[i].City;
		var state = files[i].State;
		var zip = files[i].Zip;
		var url = "https://maps.googleapis.com/maps/api/streetview?size=600x300&location="+address + " " + city + " " +state + " " + zip + "&key=AIzaSyDyEo8dMx4Z9q4VxaJfDhM5u4yulYX5afo";
	    var url2 = "https://maps.googleapis.com/maps/api/staticmap?maptype=satellite&center="+address + " " + city + " " +state + " " + zip + "&zoom=19&size=600x300&key=AIzaSyAcQrsRSOCK90kMnwANw9dcAqcv5FOfbhY"
	    // extract the file name
	    console.log(url);
	    var file_name = address;
	    downloadRequest(url, url2, file_name, filepath);
	    count++;
	}
	zipUp(filepath, count);

};

//called for each photo request
var downloadRequest = function(url, url2, filename, path){
	var fullpath = path + filename + ".jpg";

	var needSat = false;
	//request(url).pipe(fs.createWriteStream(fullpath));
	request
		.get(url)
		.on('response', function(response) {
			console.log(response.statusCode) // 200 
	    	console.log(response.headers['content-length']) // 'image/png'
	    	if(parseInt(response.headers['content-length']) >= 6000){
	    		response.pipe(fs.createWriteStream(fullpath));
	    	}else { needSat = true;
	    		request
				  .get(url2)
				  .pipe(fs.createWriteStream(fullpath));
	    	}
		})
};


module.exports = function(app, passport) {

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

	app.post('/endpoints/getZip', function(req, res, next) {
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

    			var date = new Date();
    			var folder = __dirname + '/../public/mapImages/';

    			//call to download function, downloads the images
    			download(stuff, folder);
    			//zipUp(folder);


    			//delete the excel file
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
