// Includes
const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const body_parser = require('body-parser');

// Include our database file
const db = require('./db.js');

// Instantiate express
const app = express();

// Port our express listen server will run on
const port = 3000;

// Contact details displayed on the web pages
const phone_number = '+440123456789';
const contact_email = 'contactus@lobike.com';

// Set up Pug as our view engine
app.set('view engine', 'pug')
app.set('views', path.join(__dirname, '/views/'));

// Assign the path where our clientside files will be
app.use(express.static(__dirname + '/public'));

// Set up body parser for parsing JSON
app.use(body_parser.urlencoded({extended: false}));
app.use(body_parser.json());

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

            console.log(bike.rating);
            
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
            bikes: available_bikes
        });
    })
    .catch((db_err) => {
        res.send('<h2>Database error, please try again later.<h2>');
        console.log(db_err);
    });
});

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

app.post('/submit-login', (req, res) => {
    var details = req.body;

    if (details.username.length == 0) {
        res.render('login.pug', {
            page_title: 'Login',
            contact_details: {
                phone: phone_number,
                email: contact_email
            },
            error: 'Please enter a username'
        });
    } else if (details.password.length == 0) {
        res.render('login.pug', {
            page_title: 'Login',
            contact_details: {
                phone: phone_number,
                email: contact_email
            },
            error: 'Please enter a password'
        });
    }

    db.client.query('SELECT * FROM customer WHERE username = $1;', [details.username])
    .then((db_res) => {
        if (db_res.rows.length == 0) {
            res.render('login.pug', {
                page_title: 'Login',
                contact_details: {
                    phone: phone_number,
                    email: contact_email
                },
                error: 'No user exists with this username'
            });
        } else {
            var record = db_res.rows[0];
            
            bcrypt.compare(details.password, record.password)
            .then((matches) => {
                if (matches) {
                    console.log('Logged in!');
                    res.redirect('/');  // Return to home page
                } else {
                    res.render('login.pug', {
                        page_title: 'Login',
                        contact_details: {
                            phone: phone_number,
                            email: contact_email
                        },
                        error: 'Incorrect password'
                    });
                }
            });
        }
    })
    .catch((db_err) => {
        res.send('<h2>Database error, please try again later.<h2>');
        console.log(db_err);
    });
});

app.post('/submit-registration', (req, res) => {
    var details = req.body;
    var full_phone_number = details.country_code + details.phone_number;
    
    if (details.username.length == 0) {
        res.render('register.pug', {
            page_title: 'Register',
            contact_details: {
                phone: phone_number,
                email: contact_email
            },
            error: 'Please enter a username'
        });
    } else if (details.password.length == 0) {
        res.render('register.pug', {
            page_title: 'Register',
            contact_details: {
                phone: phone_number,
                email: contact_email
            },
            error: 'Please enter a password'
        });
    } else if (details.confirm_password.length == 0) {
        res.render('register.pug', {
            page_title: 'Register',
            contact_details: {
                phone: phone_number,
                email: contact_email
            },
            error: 'Please confirm your password'
        });
    } else if (details.confirm_password != details.password) {
        res.render('register.pug', {
            page_title: 'Register',
            contact_details: {
                phone: phone_number,
                email: contact_email
            },
            error: 'Passwords do not match'
        });
    } else {
        db.client.query('SELECT * FROM customer WHERE username = $1', [details.username])
        .then((db_res) => {
            if (db_res.rows.length == 0) {
                // Hash the password and insert the customer into the database
                bcrypt.hash(details.password, 10)
                .then((hashed_pass) => {
                    db.client.query(`INSERT INTO customer (first_name, surname, contact_number, username, password)
                        VALUES ($1, $2, $3, $4, $5)`, [details.first_name, details.surname, full_phone_number, details.username, hashed_pass]);
                })
                .catch((db_err) => {
                    console.log(db_err);
    
                    // Was a database error so return the user to the register page
                    res.render('register.pug', {
                        page_title: 'Register',
                        contact_details: {
                            phone: phone_number,
                            email: contact_email
                        },
                        error: 'Failed to add your details to the database'
                    });
                });
            } else {
                // Database returned a record so username already in use
                res.render('register.pug', {
                    page_title: 'Register',
                    contact_details: {
                        phone: phone_number,
                        email: contact_email
                    },
                    error: 'Username is already in use'
                });
            }
        })
        .catch((db_err) => {
            console.log(db_err);
    
            // Was a database error so return the user to the register page
            res.render('register.pug', {
                page_title: 'Register',
                contact_details: {
                    phone: phone_number,
                    email: contact_email
                },
                error: 'Failed to retrieve accounts from database'
            });
        });
    }

});

// Set up a listen server using Express
app.listen(port, () => {
    console.log('Express listening on port ' + port);
});
