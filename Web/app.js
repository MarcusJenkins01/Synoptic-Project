const express = require('express');
const path = require('path');

var app = express();
var port = 3000;

app.set('views', path.join(__dirname, '/views/'));

app.get('/', (req, res) => {
    res.send(`
        <h1>Test index page</h1>
        <h3>Click <a href="/database">here</a> for access to the db</h3>
    `);
});

app.listen(port, () => {
    console.log('Express listening of port ' + port)
});
