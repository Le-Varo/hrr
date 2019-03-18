const crypto = require("crypto-js");
const db = require("../database.js");

function getToken(username, password) {
    return crypto.SHA256(crypto.enc.Base64.stringify(crypto.enc.Utf8.parse(username + ":" + crypto.SHA1(password).toString())).toString() + "Kt3rmin3LSufr1m1ent0!").toString();
}

function get(token, callback) {
    var query = {
        access_token: ["=", token]
    }
    db.select("k_users", [query], null, 1, null, false, [], function (error, result) {
        if (error) {
            callback(error, null)
        } else if (result[0]) {
            callback(null, result);
        } else{
            callback(error, null)
        }

    })
};

function login(user, pass, token, callback) {
    token = (token) ? token : getToken(user, pass);
    get(token, function (error, user) {
        if (error) {
            console.error(error);
        } else if (user) {
            callback(null, user);
        } else {
            callback(true, null)
        }
    })
}

module.exports = {
    get: get,
    login: login
}