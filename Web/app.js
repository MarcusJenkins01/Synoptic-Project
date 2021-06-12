const express = require('express');
const path = require('path');

// Include our database file
const db = require('./db.js');

const app = express();
const port = 3000;

// Contact details
const phone_number = '+440123456789';
const contact_email = 'contactus@lobike.com';

// Set up Pug as our view engine
app.set('view engine', 'pug')
app.set('views', path.join(__dirname, '/views/'));

// Assign the path where our clientside files will be
app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
    var query = `SELECT bike_id, brand, bike_image, available, COALESCE(ROUND(AVG(rating)), 0) AS rating
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
                    brand: bike.brand,
                    bike_image: bike.bike_image,
                    rating: bike.rating
                }
            }
        }

        res.render('index.pug', {
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
        contact_details: {
            phone: phone_number,
            email: contact_email
        }
    });
});

// Set up a listen server using Express
app.listen(port, () => {
    console.log('Express listening on port ' + port)
});
