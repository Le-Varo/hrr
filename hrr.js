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

var knownErrors = {
  "BODY_INVALID": {
    status: 400,
    msg: "Invalid JSON Body"
  },
  "LOGIN_FAILED": {
    msg: "Login Failed! Username or password is incorrect.",
    status: 401
  },
  "METH_NOTFOUND": {
    msg: "Method not found",
    status: 404
  },
  "PAR_INUSE": {
    msg: "Parameters in Use.",
    status: 400
  },
  "PAR_MISSING": {
    msg: "Missing parameters.",
    status: 400
  },
  "REGISTER_FAILED": {
    msg: "Registration failed! Try Again.",
    status: 403
  },
  "UNKNOWN_ERROR": {
    status: 500,
    msg: "Unknowkn Error"
  }
}

function sendResponse(req, res) {
  var response = {
    response_time: ''
  };

  if (res.user) {
    response.user = res.user;
  } else if (res.error) {
    response.request = req.url;
    response.method = req.method;
    response.error = res.error;

    res.status(response.error.status);
  } else {
    response.request = req.url;
    response.method = req.method;
    response.error = knownErrors["METH_NOTFOUND"];

    res.status(response.error.status);
  }
  response.response_time = (new Date().getTime() - req._startTime.getTime()) + " ms";

  res.send(response);
}

function login(req, res, next) {
  var email = req.body.email;
  var pass = req.body.password;
  var token = "";

  if (!email && !pass) {
    var auth = basicAuth(req);
    token = (auth) ? auth.name : "";
  }

  users.login(email, pass, token, function (err, user) {
    if (err) {
      console.error(err);
      res.error = knownErrors["LOGIN_FAILED"];

      next();
    } else {
      res.user = user;
      next();
    }
  })
}

function register(req, res, next) {
  var user = basicAuth(req);
  var user = req.body.username;
  var pass = req.body.password;

  var parameters = {
    "username": user,
    "password": pass
  }

  users.register(parameters, function (err, user) {
    if (err) {
      console.error(err);
      res.error = (knownErrors.hasOwnPropert(err.message)) ? knownErrors[err.message] : knownErrors["REGISTER_FAILED"];

      next();
    } else {
      res.user = user;
      next();
    }
  })
}

router.post(api_dir + "login", [login, sendResponse]);
router.post(api_dir + "register", [register, sendResponse]);


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
    response.error = knownErrors["BODY_INVALID"];

    res.status(400).json(response);
  } else {
    response.error = knownErrors["UNKNOWN_ERROR"];

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