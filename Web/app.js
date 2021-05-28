const express = require('express');
const path = require('path');

// Include our database file
const db = require('./db.js');

var app = express();
var port = 3000;

// Set up Pug as our view engine
app.set('view engine', 'pug')
app.set('views', path.join(__dirname, '/views/'));

// Assign the path where our clientside files will be
app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
    // A test to check our correspondance with PostgreSQL works
    db.client.query('SELECT * FROM lender;')
        .then((db_res) => {
            res.render('lender_table.pug', {
                lenders: db_res.rows
            });

            console.log(db_res.rows);
        })
        .catch((db_err) => {
            res.send('<h2>Database error, please try again later.<h2>');
            console.log(db_err);
        });
});

// Set up a listen server using Express
app.listen(port, () => {
    console.log('Express listening on port ' + port)
});
