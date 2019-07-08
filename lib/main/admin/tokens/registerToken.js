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

const db = require("../../database.js");
const config = require("../../config.js");
const mailer = require('../../../aux/mailer.js');

// Esquema de los atributos de los tokens
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
        expires: config.getTokenConfig().TTL
    }
}

/**
 * Función de envío de token
 * 
 * Entrada:
 *    - token:      Token a mandar
 *    - user:       Datos del usuario que recibirá el token       
 *    - callback:   Función que devolverá los errores que se produzcan
 * 
 * Funcionamiento:
 *    Se crea el cuerpo del mensaje y se usa el mailer para mandarlo
 * 
 */
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

/**
 * Función principal de generación de token de registro
 * 
 * Entrada:
 *    - user:       Datos del usuario que recibirá el token       
 *    - callback:   Función que devolverá los errores que se produzcan
 * 
 * Funcionamiento:
 *    Se crean los datos del nuevo token y se guarda en base de datos, 
 *    teniendo en cuenta de que si hay otro se actualiza.
 * 
 */
function generate(user, callback) {
    var tokenHash = crypto.createHash("sha256").update(crypto.randomBytes(16).toString('hex').concat(config.getTokenConfig().magicWord));
    var token = tokenHash.digest('hex');

    var query = [{
        access_token: ["=", user.access_token]
    }];
    var token = {
        "access_token": user.access_token,
        "token": token,
        "createdAT": new Date()
    }

    // Si no existe el token, se crea
    var options = {
        upsert: true
    };

    // Se usa update para actualizar el posible token anterior
    db.update("registerToken", query, token, tokenSchema, options, function (error, tokens) {
        if (error) {
            callback(error);
        } else {
            sendToken(tokens[0].token, user, function (error) {
                if (error) {
                    callback(error);
                } else {
                    callback(null);
                }
            });
        }
    });
}

/**
 * Función de activación
 * 
 * Entrada:
 *    - token:      Token a comprobar     
 *    - callback:   Función que devolverá los errores que se produzcan y la información del token
 * 
 * Funcionamiento:
 *    Saca el token de base de datos y lo devuelve.
 * 
 */
function activate(token, callback) {
    var query = [{
        "token": ["=", token]
    }];
    db.remove("registerToken", query, tokenSchema, function (error, result) {
        if (error) {
            callback(error, null)
        } else if (result[0]) {
            // Comprobamos si por lapso de tiempo el token es válido, aunque esta comprobación la hace BBDD
            var timeLapse = new Date().getTime() - new Date(result[0].createdAT).getTime();
            if (timeLapse < config.getTokenConfig().TTL) {
                callback(null, result[0]);
            } else {
                callback(new Error("ACTIVATION_EXPIRED"), null)
            }
        } else {
            callback(new Error("ACTIVATION_NOTOKEN"), null)
        }
    });
}

/* Funciones a exportar */
module.exports = {
    generate: generate,
    activate: activate
}