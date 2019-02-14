const express = require("express");
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