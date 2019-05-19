"use stric";

const express = require("express");

const FileStreamRotator = require('file-stream-rotator');
const morgan = require('morgan');
const fs = require('fs');

const bodyParser = require("body-parser");
const methodOverride = require("method-override");
const helmet = require('helmet');

const basicAuth = require('basic-auth');

const config = require("./lib/main/config.js")
const users = require("./lib/main/admin/users.js");
const registerToken = require("./lib/main/admin/registerToken.js");

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
    msg: "Invalid JSON Body",
    status: 400
  },
  "LOGIN_FAILED": {
    msg: "Login Failed! Email or password are incorrect.",
    status: 401
  },
  "METH_NOTFOUND": {
    msg: "Method not found",
    status: 404
  },
  "PAR_INUSE": {
    msg: "Email in Use.",
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
    msg: "Unknowkn Error",
    status: 500
  },
  "VALIDATION_EXPIRED": {
    msg: "Validation failed! Token has Expired",
    status: 403
  },
  "VALIDATION_FAILED": {
    msg: "Validation failed!",
    status: 403
  },
  "VALIDATION_NOTOKEN": {
    msg: "Validation failed! No token found for this user",
    status: 403
  },
  "RESETTOKEN_FAILED": {
    msg: "Reset Token failed!",
    status: 403
  }
}

function sendResponse(req, res) {
  var response = {
    response_time: ''
  };
  if (res.done) {
    response.done = res.done;
  } else if (res.user) {
    response.user = res.user;
  } else if (res.updated) {
    response.updated = res.updated;
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

function preAPI(req, res, next) {
  config.setHost(req.get('host'));
  next();
}

function login(req, res, next) {
  var email = req.body.email;
  var pass = req.body.password;
  var token = "";

  if (!email && !pass) {
    var auth = basicAuth(req);
    token = (auth) ? auth.name : "";
  }

  if (!email && !pass && !token) {
    res.error = knownErrors["LOGIN_FAILED"];
    next();
  } else {
    users.login(email, pass, token, function (err, user) {
      if (err) {
        // console.error(err);
        res.error = knownErrors["LOGIN_FAILED"];
        next();
      } else {
        res.user = user;
        next();
      }
    })
  }
}

function register(req, res, next) {
  var email = req.body.email;
  var pass = req.body.password;

  if (email === undefined || pass === undefined) {
    res.error = knownErrors["PAR_MISSING"];
    next();
  } else {
    var parameters = {
      "email": email,
      "password": pass
    }

    users.register(parameters, function (err, user) {
      if (err) {
        // console.error(err);
        res.error = (knownErrors.hasOwnProperty(err.message)) ? knownErrors[err.message] : knownErrors["REGISTER_FAILED"];
        next();
      } else {
        res.user = user;
        next();
      }
    })
  }
}

function activate(req, res, next) {
  var id = req.query.id;
  if (id === undefined) {
    res.error = knownErrors["PAR_MISSING"];
    next();
  } else {
    registerToken.activate(id, function (error, result) {
      if (error) {
        res.error = (knownErrors.hasOwnProperty(error.message)) ? knownErrors[error.message] : knownErrors["VALIDATION_FAILED"];
        next();
      } else {
        users.activate(result.access_token, function (error, result) {
          if (error) {
            res.error = (knownErrors.hasOwnProperty(err.message)) ? knownErrors[err.message] : knownErrors["VALIDATION_FAILED"];
            next();
          } else {
            res.updated = result;
            next();
          }
        });
      }
    });
  }
}

function askResetToken(req, res, next) {
  var email = req.query.email;
  if (email === undefined) {
    res.error = knownErrors["PAR_MISSING"];
    next();
  } else {
    users.askResetToken(email, function (error) {
      if (error) {
        res.error = (knownErrors.hasOwnProperty(error.message)) ? knownErrors[error.message] : knownErrors["RESETTOKEN_FAILED"];
        next();
      } else {
        res.done = true;
        next();
      }
    });
  }
}


router.post(api_dir + "login", [preAPI, login, sendResponse]);
router.post(api_dir + "register", [preAPI, register, sendResponse]);
router.get(api_dir + "activate", [preAPI, activate, sendResponse]);
router.get(api_dir + "askResetToken", [preAPI, askResetToken, sendResponse]);
// router.get(api_dir + "reset", [preAPI, reset, sendResponse]);

// router.post(api_dir + "modify/:source/:id", [preAPI, modify, sendResponse]);
// router.post(api_dir + "remove/:source/:id", [preAPI, remove, sendResponse]);
// router.post(api_dir + "add/:source", [preAPI, add, sendResponse]);

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