const express = require('express');
const path = require('path');

var app = express();
var port = 3000;

app.set('view engine', 'pug')
app.set('views', path.join(__dirname, '/views/'));

app.get('/', (req, res) => {
    res.send(`
        <h1>Test index page</h1>
    `);
});

app.listen(port, () => {
    console.log('Express listening on port ' + port)
});
