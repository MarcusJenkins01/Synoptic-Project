// Using PostgreSQL
const {Client} = require('pg');

const db_details = {
    user: 'group32',
    host: 'localhost',
    database: 'synoptic_project',
    password: 'bingus2000',
    port: '5432'
};

client = new Client(db_details);

client.connect((err) => {
    if (err) {
        console.error(err)
    } else {
        console.log('Successfully connected to database')
    }
});

// Assign for export
exports.client = client;
