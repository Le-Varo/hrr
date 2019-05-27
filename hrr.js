"use stric";

const express = require("express");

const FileStreamRotator = require('file-stream-rotator');
const morgan = require('morgan');
const fs = require('fs');

const bodyParser = require("body-parser");
const methodOverride = require("method-override");
const helmet = require('helmet');

const basicAuth = require('basic-auth');

const config = require("./lib/main/config.js");
const Query = require("./lib/main/query.js");

var sources = {};
sources["users"] = require("./lib/main/admin/users.js");

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
  "RESETTOKEN_FAILED": {
    msg: "Reset Token failed!",
    status: 403
  },
  "RESETTOKEN_EXPIRED": {
    msg: "Reset Token failed! Token has Expired",
    status: 403
  },
  "RESETTOKEN_NOTOKEN": {
    msg: "Reset Token failed! No token found for this user",
    status: 403
  },
  "UNKNOWN_ERROR": {
    msg: "Unknowkn Error",
    status: 500
  },
  "ACTIVATION_FAILED": {
    msg: "Activation failed!",
    status: 403
  },
  "ACTIVATION_EXPIRED": {
    msg: "Activation failed! Token has Expired",
    status: 403
  },
  "ACTIVATION_NOTOKEN": {
    msg: "Activation failed! No token found for this user",
    status: 403
  }
}

function sendResponse(req, res) {
  var response = {
    response_time: ''
  };

  if (res.result) {
    response.results_count = (res.result[0] !== undefined && res.result[0].count !== undefined) ? res.result[0].count : res.result.length;

    if (req.body.resultsPerPage) {
      response.page = req.body.page;
      response.nextPage = "None";
      if (req.body.resultsPerPage <= res.result.length) {
        response.nextPage = (req.body.page + 1);
      }
    }

    response.results = (res.result[0] !== undefined && res.result[0].count !== undefined) ? undefined : res.result;
  } else if (res.done) {
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

function getHost(req, res, next) {
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
    sources["users"].login(email, pass, token, function (error, user) {
      if (error) {
        console.error(error);
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

    sources["users"].register(parameters, function (error, user) {
      if (error) {
        console.error(error);
        res.error = (knownErrors.hasOwnProperty(error.message)) ? knownErrors[error.message] : knownErrors["REGISTER_FAILED"];
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
    sources["users"].activate(id, function (error, result) {
      if (error) {
        console.error(error);
        res.error = (knownErrors.hasOwnProperty(error.message)) ? knownErrors[error.message] : knownErrors["ACTIVATION_FAILED"];
        next();
      } else {
        res.updated = result;
        next();
      }
    });
  }
}

function askResetToken(req, res, next) {
  var email = req.body.email;
  if (email === undefined) {
    res.error = knownErrors["PAR_MISSING"];
    next();
  } else {
    sources["users"].askResetToken(email, function (error) {
      if (error) {
        console.error(error);
        res.error = (knownErrors.hasOwnProperty(error.message)) ? knownErrors[error.message] : knownErrors["RESETTOKEN_FAILED"];
        next();
      } else {
        res.done = true;
        next();
      }
    });
  }
}

function resetPassword(req, res, next) {
  var newPassword = req.query.newPassword;
  var token = req.query.id;
  if (newPassword === undefined || token === undefined) {
    res.error = knownErrors["PAR_MISSING"];
    next();
  } else {
    sources["users"].resetPassword(token, newPassword, function (error, result) {
      if (error) {
        console.error(error);
        res.error = (knownErrors.hasOwnProperty(error.message)) ? knownErrors[error.message] : knownErrors["RESETTOKEN_FAILED"];
        next();
      } else {
        res.updated = result;
        next();
      }
    })
  }
}

function get(req, res, next) {
  var query = (req.params.query) ? req.params.query : "";
  var sour = req.params.source;

  try {
    var source;
    if (sources[sour]) {
      source = sources[sour];
    } else {
      source = require('./lib/main/admin/' + sour + '.js');
      sources[sour] = source;
    }
    source.get(new Query(query), req.body, function (error, result) {
      if (error) {
        // console.error(error);
      } else {
        res.result = result;
        next();
      }
    });
  } catch (e) {
    // console.error(e)
    res.error = knownErrors["METH_NOTFOUND"];
    next();
  }
}

function checkUser(req, res, next) {
  function unauthorized(res) {
    res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
    return res.sendStatus(401);
  }
  var user = basicAuth(req);

  if (!user || !user.name) {
    return unauthorized(res);
  } else {
    sources["users"].check(user.name, function (error, result) {
      if (error) {
        if (error.message === "UNAUTHORIZED") {
          console.error(error);
          return unauthorized(res);
        } else {
          console.error(error);
        }
      } else {
        next()
      }
    });
  }
}


router.post(api_dir + "register", [getHost, register, sendResponse]);
router.get(api_dir + "activate", [activate, sendResponse]);
router.post(api_dir + "login", [login, sendResponse]);
router.post(api_dir + "askResetToken", [getHost, askResetToken, sendResponse]);
router.get(api_dir + "resetPassword", [getHost, resetPassword, sendResponse]);

router.post(api_dir + "get/:source/:query*?", [checkUser, get, sendResponse]);
// router.post(api_dir + "modify/:source/:id", [checkUser, modify, sendResponse]);
// router.post(api_dir + "remove/:source/:id", [checkUser, remove, sendResponse]);
// router.post(api_dir + "add/:source", [checkUser, add, sendResponse]);

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