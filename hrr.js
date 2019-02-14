"use stric";

const express = require("express");

const FileStreamRotator = require('file-stream-rotator');
const morgan = require('morgan');
const fs = require('fs');

const bodyParser  = require("body-parser");
const methodOverride = require("method-override");
const mongoose = require('mongoose');
const helmet = require('helmet');

var app = express();
var port = 3000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(methodOverride());
app.use(helmet());

var logDirectory = 'log';
// Se asegura de que el directorio existe
if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory);
}
// Crea un stream de escritura rotatorio
var accessLogStream = FileStreamRotator.getStream({
    date_format: 'YYYYMMDD',
    filename: logDirectory + '/access-%DATE%.log',
    frequency: 'daily',
    verbose: false
});

app.use(morgan('combined', { stream: accessLogStream }));

var router = express.Router();

router.get('/', function(req, res) {
   res.send("Hello World!");
});

app.use(router);

app.listen(port, function() {
  console.log("Node server running on http://localhost:%s",port);
});

process.on('uncaughtException', function (e) {
  console.error(e);
});