// Includes
const express = require('express');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcrypt');
const body_parser = require('body-parser');
const fetch = require('node-fetch');

// Include our database file
const db = require('./db.js');

// Instantiate express
const app = express();

// Port our express listen server will run on
const port = 3000;

// Contact details displayed on the web pages
const phone_number = '+440123456789';
const contact_email = 'contactus@lobike.com';

// Our secret token for recaptcha
const recaptcha_secret = '6LfYVS4bAAAAAKYYW4ULWua5inLYwjoBANmOZF-_';

// Set up Pug as our view engine
app.set('view engine', 'pug')
app.set('views', path.join(__dirname, '/views/'));

// Assign the path where our clientside files will be
app.use(express.static(__dirname + '/public'));

// Set up body parser for parsing JSON
app.use(body_parser.urlencoded({extended: false}));
app.use(body_parser.json());

// Set up a session using a random unique session ID
app.use(session({
    secret: 'viq1&S9nmmgP3iyly4u6*NKz',
    resave: false,
    saveUninitialized: false
}));

// Index page
app.get('/', (req, res) => {
    var query = `SELECT bike_id, price, brand, bike_image, available, COALESCE(ROUND(AVG(rating)), 0) AS rating
    FROM bike
    LEFT JOIN rating
    USING (bike_id)
    GROUP BY bike_id;`;

    db.client.query(query)
    .then((db_res) => {
        var available_bikes = {};

        for (var key in db_res.rows) {
            var bike = db_res.rows[key];
            
            if (bike.available) {
                available_bikes[key] = {
                    bike_id: bike.bike_id,
                    price: bike.price,
                    brand: bike.brand,
                    bike_image: bike.bike_image,
                    rating: bike.rating
                }
            }
        }

        res.render('index.pug', {
            page_title: 'Choose your ride',
            contact_details: {
                phone: phone_number,
                email: contact_email
            },
            bikes: available_bikes,
            user_details: {
                logged_in: req.session.loggedin,
                user_id: req.session.userid,
                first_name: req.session.firstname
            }
        });
    })
    .catch((db_err) => {
        res.send('<h2>Database error, please try again later.<h2>');
        console.log(db_err);
    });
});

// Individual bike page
app.get('/bikes', (req, res) => {
    const bike_id = req.query.id;

    const db_query = `SELECT * FROM bike
    INNER JOIN lender
    USING (lender_id)
    WHERE bike_id = $1;`;  // Parameterised query to protect against SQL injection

    db.client.query(db_query, [bike_id])
    .then((db_res) => {
        var record = db_res.rows[0];

        res.render('bike.pug', {
            lender_details: {
                lender_id: record.lender_id,
                first_name: record.first_name,
                surname: record.surname,
                contact_number: record.contact_number,
                photo_url: record.photo_url
            },
            bike_details: {
                bike_id: record.bike_id,
                price: record.price,
                brand: record.brand,
                available: record.available,
                bike_image: record.bike_image
            },
            contact_details: {
                phone: phone_number,
                email: contact_email
            }
        });
    })
    .catch((db_err) => {
        res.send('<h2>Database error, please try again later.<h2>');
        console.log(db_err);
    });
});

// Login page
app.get('/login', (req, res) => {
    res.render('login.pug', {
        page_title: 'Login',
        contact_details: {
            phone: phone_number,
            email: contact_email
        },
        error: ''
    });
});

// Register page
app.get('/register', (req, res) => {
    res.render('register.pug', {
        page_title: 'Register',
        contact_details: {
            phone: phone_number,
            email: contact_email
        },
        error: ''
    });
});

// Handle login form
app.post('/login', (req, res) => {
    var details = req.body;
    var captcha_response = details['g-recaptcha-response'];

    fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: `secret=${recaptcha_secret}&response=${captcha_response}`
    })
    .then((fetch_res) => fetch_res.json())
    .then((res_json) => {
        var captcha_successful = res_json.success;

        if (captcha_successful) {
            // Serverside validation
            if (details.username.length == 0) {
                res.send('Please enter a username');
            } else if (details.password.length == 0) {
                res.send('Please enter a password');
            } else {
                db.client.query('SELECT * FROM customer WHERE username = $1;', [details.username])
                .then((db_res) => {
                    if (db_res.rows.length == 0) {
                        res.send('No user exists with this username');
                    } else {
                        var record = db_res.rows[0];
                        
                        // Check if the hash of the given password matches the hash of the stored password
                        bcrypt.compare(details.password, record.password)
                        .then((matches) => {
                            if (matches) {
                                // Set up the session for the user
                                req.session.loggedin = true;
                                req.session.userid = record.customer_id;
                                req.session.firstname = record.first_name;

                                // Send empty string to signify no error to AJAX
                                res.send('');
                            } else {
                                res.send('Password incorrect');
                            }
                        });
                    }
                })
                .catch((db_err) => {
                    console.log(db_err);

                    // Error accessing the customer table
                    res.send('Error retrieving accounts, try again later');
                });
            }
        } else {
            res.send('Please complete the captcha');
        }
    })
    .catch((fetch_err) => {
        res.send('Error validating captcha');
    });
});

//
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Handle register form
app.post('/register', (req, res) => {
    var details = req.body;

    var captcha_response = details['g-recaptcha-response'];
    var full_phone_number = details.country_code + details.phone_number;

    fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: `secret=${recaptcha_secret}&response=${captcha_response}`
    })
    .then((fetch_res) => fetch_res.json())
    .then((res_json) => {
        var captcha_successful = res_json.success;

        if (captcha_successful) {
            // Do checks on the serverside as well to prevent any exploits
            if (details.username.length == 0) {
                res.send('Please enter a username');
            } else if (details.password.length == 0) {
                res.send('Please enter a password');
            } else if (details.confirm_password.length == 0) {
                res.send('Please confirm your password');
            } else if (details.confirm_password != details.password) {
                res.send('Passwords do not match');
            } else {
                db.client.query('SELECT * FROM customer WHERE username = $1', [details.username])
                .then((db_res) => {
                    if (db_res.rows.length == 0) {
                        // Hash the password and insert the customer into the database
                        bcrypt.hash(details.password, 10)
                        .then((hashed_pass) => {
                            db.client.query(`INSERT INTO customer (first_name, surname, contact_number, username, password)
                                VALUES ($1, $2, $3, $4, $5)
                                RETURNING customer_id;`, [details.first_name, details.surname, full_phone_number, details.username, hashed_pass])
                            .then((db_res) => {
                                // The customer_id that was generated by the database
                                var generated_id = db_res.rows[0].customer_id;

                                // Set up the session for the user
                                req.session.loggedin = true;
                                req.session.userid = generated_id;
                                req.session.firstname = details.first_name;

                                // Send empty string to signify no error to AJAX
                                res.send('');
                            })
                            .catch((db_err) => {
                                console.log(db_err);
                
                                // Error inserting customer record
                                res.send('Error adding account to database');
                            });
                        });
                    } else {
                        // Database returned a record so username already in use
                        res.send('Username already in use');
                    }
                })
                .catch((db_err) => {
                    console.log(db_err);
            
                    // Error accessing the customer table
                    res.send('Error retrieving accounts, try again later');
                });
            }
        } else {
            res.send('Please complete the captcha');
        }
    })
    .catch((fetch_err) => {
        res.send('Error validating captcha');
    });
});

// Set up a listen server using Express
app.listen(port, () => {
    console.log('Express listening on port ' + port);
});
