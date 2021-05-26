const {Client} = require('pg');

const db_details = {
    user: 'group32',
    host: 'localhost',
    database: 'synoptic_project',
    password: 'bingus2000',
    port: '5432'
};

const db_client = new Client(db_details);

db_client.connect((err) => {
    if (err) {
        console.error(err)
    } else {
        console.log('Successfully connected to database')
    }
});

db_client.query('SELECT * FROM lender;', (err, res) => {
    if (err) {
        console.log(err);
    } else {
        console.log(res.rows[0]);
    }
});
