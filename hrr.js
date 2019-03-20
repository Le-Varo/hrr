"use stric";

const express = require("express");

const FileStreamRotator = require('file-stream-rotator');
const morgan = require('morgan');
const fs = require('fs');

const bodyParser = require("body-parser");
const methodOverride = require("method-override");
const helmet = require('helmet');

const basicAuth = require('basic-auth');
const users = require("./lib/main/admin/users.js");

var app = express();
// Deja elegir a heroku el puerto
var port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({
  extended: false
}));
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

app.use(morgan('combined', {
  stream: accessLogStream
}));

var api_dir = "/";

var router = express.Router();

function sendResponse(req, res) {
  var response = {
    response_time: ''
  };

  if (res.user) {
    response.user = res.user[0];
  } else if (res.error) {
    response.request = req.url;
    response.method = req.method;
    response.error = res.error;

    res.status(response.error.status);
  } else {
    response.request = req.url;
    response.method = req.method;
    response.error = {
      status: 404,
      msg: "Method not found"
    };

    res.status(response.error.status);
  }
  response.response_time = (new Date().getTime() - req._startTime.getTime()) + " ms";

  res.send(response);
}

router.post(api_dir + "login", [function (req, res, next) {
  var user = basicAuth(req);
  var user = req.body.username;
  var pass = req.body.password;
  var token = "";

  if (!user && !pass) {
    var auth = basicAuth(req);
    token = (auth) ? auth.name : "";
  }

  users.login(user, pass, token, function (err, user) {
    if (err) {
      res.error = {
        status: 400,
        msg: "Login Failed! Username or password is incorrect."
      };
      next();
    } else {
      res.user = user;
      next();
    }
  })
}, sendResponse]);

router.all(api_dir + '*', [sendResponse]); // Recoge el resto de peticiones

app.use(router);

app.use(function (err, req, res, next) {
  console.error(err.stack);
  var time = new Date().getTime();
  var response = {
    response_time: (new Date().getTime() - time) + "ms",
    request: req.url,
    method: req.method
  }
  if (err instanceof SyntaxError) {
    response.error = {
      status: 400,
      msg: "Invalid JSON Body"
    };

    res.status(400).json(response);
  } else {
    response.error = {
      status: 500,
      msg: "Unknowkn Error"
    };

    res.status(500).json(response);
    next();
  }
});

app.listen(port, function () {
  console.log("Node server running on http://localhost:%s", port);
});

process.on('uncaughtException', function (e) {
  console.error(e);
});