/**
 * Implementación del módulo de gestión de usuarios
 * 
 * Dependecias:
 *    - crypto	-> Implementación de funciones criptográficas;
 * 
 * Propias:
 *    - db  	-> Gestión de base de Datos;
 * 
 * Funcionamiento:
 *      El módulo implementa los métodos empleados para la administración de usuarios, 
 *      como pueden ser el registro, login, selección, modificación...
 * 
 * Útima modificación:  20/03/2019
 * Autor/es:            Alvaro Colomo
 * 
 */

/* Carga de dependencias */
const crypto = require("crypto-js");
const db = require("../database.js");

// Esquema de los atributos de los usuarios
var userSchema = {
    username: {
        type: String,
        unique: true,
        index: true,
        lowercase: true
    },
    access_token: {
        type: String,
        index: true
    },
    collections: [],
    isVerified: {
        type: Boolean,
        default: false,
        hide: true
    },
    validToken: {
        type: String,
        hide: true
    },
}

function createUser(parameters) {
    var valid = parameters.hasOwnProperty("password");
    var user = {
        "isVerified": false,
        "access_token": getToken(parameters.username, parameters.password)
    };
    Object.keys(userSchema).forEach(function (key) {
        if (userSchema[key].unique) {
            if (parameters.hasOwnProperty(key)) {
                user[key] = parameters[key];
            } else if (!user.hasOwnProperty(key)) {
                valid = valid && false;
            }
        } else {
            user[key] = (parameters.hasOwnProperty(key)) ? parameters[key] : user[key];
        }
    });
    return (valid) ? user : false;
}

/**
 * Función auxiliar de generación del access_token
 * 
 * Entrada:
 *    - username:   Nombre de usuario.
 *    - password:   Contraseña del usuario.
 * 
 * Salida:
 * 	  - String: Access_token
 * 
 * Funcionamiento:
 *    Dados unos credenciales, se genera mediante criptografía un access_token.
 * 
 */
function getToken(username, password) {
    return crypto.SHA256(crypto.enc.Base64.stringify(crypto.enc.Utf8.parse(username + ":" + crypto.SHA1(password).toString())).toString() + "Kt3rmin3LSufr1m1ent0!").toString();
}

/**
 * Función auxiliar de selección de usuarios en BBDD
 * 
 * Entrada:
 *    - query:      Nombre de usuario.
 *    - callback:   Funcion que recibira una variable error y un array de objetos con los resultados.
 * 
 * Funcionamiento:
 *    Dada una query, se busca en BBDD dicho usuario.
 * 
 */
function _get(query, callback) {
    db.select("users", query, userSchema, null, 1, null, false, [], function (error, result) {
        if (error) {
            callback(error, null)
        } else if (result[0]) {
            callback(null, result);
        } else {
            callback(error, null)
        }

    })
};

function sanitySingleObj(obj) {
    Object.keys(userSchema).forEach(function (key) {
        if (userSchema[key].hide) {
            obj[key] = undefined;
        }
    });
    return obj;
}

function sanityResponse(obj) {
    if (obj) {
        if (obj.length !== undefined) {
            obj.forEach(function (singleObj) {
                singleObj = sanitySingleObj(obj);
            })
        } else {
            obj = sanitySingleObj(obj);
        }
    }
    return obj;
}

/**
 * Función auxiliar de adición de usuarios en BBDD
 * 
 * Entrada:
 *    - parameters:      Parametros de usuario.
 *    - callback:       Funcion que recibira una variable error.
 * 
 * Funcionamiento:
 *    Dados unos parámetros, se intenta añadir un usaurio a BBDD.
 * 
 */
function _insert(parameters, callback) {
    db.insert("users", parameters, userSchema, function (error, result) {
        if (error) {
            callback(error, null)
        } else if (result) {
            callback(null, result);
        } else {
            callback(error, null)
        }
    })
};

/**
 * Función principal de login
 * 
 * Entrada:
 *    - user:       Nombre de usuario.
 *    - pass:       Contraseña del usuario.
 *    - token:      acces_token del usuario (opcional).
 *    - callback:   Funcion que recibira una variable error y un objeto con los datos del usuario.
 * 
 * Funcionamiento:
 *    Dada una query, se busca en BBDD dicho usuario.
 * 
 */
function login(user, pass, token, callback) {
    token = (token) ? token : getToken(user, pass);
    var query = [{
        access_token: ["=", token]
    }];
    _get(query, function (error, result) {
        if (error) {
            callback(error, null)
        } else if (result && result[0].isVerified) {
            callback(null, sanityResponse(result[0]));
        } else {
            callback(true, null)
        }
    })
}

/**
 * Función principal de registro
 * 
 * Entrada:
 *    - user:       Nombre de usuario.
 *    - pass:       Contraseña del usuario.
 *    - token:      acces_token del usuario (opcional).
 *    - callback:   Funcion que recibira una variable error y un objeto con los datos del usuario.
 * 
 * Funcionamiento:
 *    Dada una query, se busca en BBDD dicho usuario.
 * 
 */
function register(parameters, callback) {
    var user = createUser(parameters);
    if (user) {
        // Comprobamos si hay algún usuario con estos parámetros
        var getQuery = [{
            username: ["=", user.username]
        }];
        _get(getQuery, function (err, result) {
            if (err) {
                callback(err, null);
            } else if (result && result[0]) {
                callback(new Error("Parameters in Use"));
            } else {
                // Si no existe el usuario, introducimos usuario
                _insert(user, function (err, result) {
                    if (err) {
                        callback(err, null);
                    } else {
                        callback(null, sanityResponse(result));
                    }
                })
            }
        })
    } else {
        callback(new Error("Missing parameters"))
    }
}

module.exports = {
    //get: get,
    login: login,
    //insert: insert,
    register: register
}