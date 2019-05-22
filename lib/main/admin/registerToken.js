/**
 * Implementación del módulo de gestión de token de Registro
 * 
 * Dependecias:
 *    - crypto	-> Implementación de funciones criptográficas;
 * 
 * Propias:
 *    - db  	-> Gestión de base de Datos;
 *    - config  -> Gestión de la configuración
 *    - mailer  -> Gestión de envío de correos
 * 
 * Funcionamiento:
 *      El módulo implementa los métodos empleados para la administración de token de registro, 
 *      como pueden ser la generación, validación de usuarios, regenerar tokens...
 * 
 * Útima modificación:  22/05/2019
 * Autor/es:            Alvaro Colomo
 * 
 */

/* Carga de dependencias */
const crypto = require("crypto");

const db = require("../database.js");
const config = require("../config.js");
const mailer = require('../../aux/mailer.js');

// Esquema de los atributos de los usuarios
var tokenSchema = {
    access_token: {
        type: String,
        unique: true,
        index: true,
    },
    token: {
        type: String,
        unique: true,
        required: true
    },
    createdAT: {
        type: Date,
        required: true,
        default: Date.now,
        expires: config.TTL
    }
}

function sendToken(token, user, callback) {
    var host = config.getHost();
    var link = "http://" + host + "/activate?id=" + token;
    var body = "Hello,<br> Please Click on the link to activate your email.<br><a href=" + link + ">Click here to activate</a>"

    mailer.sendMail("Please confirm your Email account", user.email, body, function (error) {
        if (error) {
            callback(error);
        } else {
            callback(null);
        }
    });
}

function generate(user, callback) {
    var tokenHash = crypto.createHash("sha256").update(crypto.randomBytes(16).toString('hex').concat(config.getTokenConfig().magicWord));
    var token = tokenHash.digest('hex');

    var token = {
        "access_token": user.access_token,
        "token": token
    }
    db.insert("registerToken", token, tokenSchema, function (error, token) {
        if (error) {
            callback(error, null);
        } else {
            console.log(token.token)
            sendToken(token.token, user, function (error) {
                if (error) {
                    callback(error);
                } else {
                    callback(null);
                }
            });
        }
    });
}

function activate(token, callback) {
    var query = [{
        "token": ["=", token]
    }];
    db.remove("registerToken", query, tokenSchema, function (error, result) {
        if (error) {
            callback(error, null)
        } else if (result[0]) {
            var timeLapse = new Date().getTime() - new Date(result[0].createdAT).getTime();
            if (timeLapse < config.getTokenConfig().TTL) {
                callback(null, result[0]);
            } else {
                callback(new Error("VALIDATION_EXPIRED"), null)
            }
        } else {
            callback(new Error("VALIDATION_NOTOKEN"), null)
        }
    });
}

module.exports = {
    generate: generate,
    activate: activate
}