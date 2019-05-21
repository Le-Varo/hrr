/**
 * Implementación del módulo de gestión de usuarios
 * 
 * Dependecias:
 *    - crypto	        -> Implementación de funciones criptográficas;
 * 
 * Propias:
 *    - db  	        -> Gestión de base de Datos;
 *    - config          -> Gestión de la configuración
 *    - registerToken   -> Gestión de los Token de registro
 * 
 * Funcionamiento:
 *      El módulo implementa los métodos empleados para la administración de usuarios, 
 *      como pueden ser el registro, login, selección, modificación...
 * 
 * Útima modificación:  21/05/2019
 * Autor/es:            Alvaro Colomo
 * 
 */

/* Carga de dependencias */
const crypto = require("crypto");

const db = require("../database.js");
const config = require("../config.js").getUsersConfig();
const registerToken = require("./registerToken.js");
const passwordToken = require("./passwordToken.js");


// Esquema de los atributos de los usuarios
var userSchema = {
    email: {
        type: String,
        unique: true,
        required: true,
        index: true,
        lowercase: true
    },
    access_token: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    collections: [],
    isVerified: {
        type: Boolean,
        default: false,
        unique: true,
        hide: true
    }
}

/**
 * Función auxiliar de creación de usuarios
 * 
 * Entrada:
 *    - parameters:     Parámetros de creación de usuario.
 *    
 * Salida:
 *    - False:      Si algún parametero es erróneo
 *    - user:       Usuario ya creado, teniendo en cuenta que no se pasen parámetros que no existan en BBDD.
 * 
 * Funcionamiento:
 *    Se comprueba que todos los parámetros son correctos y se procede a crear el objeto de Usuario.
 * 
 */
function createUser(parameters) {
    var valid = parameters.hasOwnProperty("password");
    var user = {
        "isVerified": false,
        "access_token": getToken(parameters.email, parameters.password)
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
 *    - email:      Mail de usuario.
 *    - password:   Contraseña del usuario.
 * 
 * Salida:
 * 	  - String: Access_token
 * 
 * Funcionamiento:
 *    Dados unos credenciales, se genera mediante criptografía un access_token.
 * 
 */
function getToken(email, password) {
    var passHash = crypto.createHash("sha256").update(password);
    var pass = passHash.digest('hex');
    var base64 = Buffer.from(email + ":" + pass).toString('base64');

    var token = crypto.createHash('sha256').update(base64 + config.magicWord);
    return token.digest('hex')
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
    db.select("users", query, userSchema, function (error, result) {
        if (error) {
            callback(error, null)
        } else if (result[0]) {
            callback(null, result);
        } else {
            callback(null, [])
        }
    })
};

/**
 * Función auxiliar de sanitización de respuesta contando con un único objeto
 * 
 * Entrada:
 *    - obj:    Objeto a sanitizar.
 *    
 * Salida:
 *    obj:      Objeto ya sanitizado, quitando variables que son invisibles al usuario.
 * 
 * Funcionamiento:
 *    La entrada se sanitiza, eliminando variables del objeto que han sido marcadas como invisibles al usuario.
 * 
 */
function sanitySingleObj(obj) {
    Object.keys(userSchema).forEach(function (key) {
        if (userSchema[key].hide) {
            obj[key] = undefined;
        }
    });
    return obj;
}

/**
 * Función auxiliar de sanitización de un array de respuesta
 * 
 * Entrada:
 *    - obj:    Objeto a sanitizar.
 *    
 * Salida:
 *    obj:      Objeto ya sanitizado, quitando variables que son invisibles al usuario.
 * 
 * Funcionamiento:
 *    La entrada se sanitiza, eliminando variables del objeto que han sido marcadas como invisibles al usuario.
 * 
 */
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
 * Función auxiliar de insertado de usuarios en BBDD
 * 
 * Entrada:
 *    - parameters:      Parametros de usuario.
 *    - callback:       Funcion que recibira una variable error.
 * 
 * Funcionamiento:
 *    Dados unos parámetros, se intenta añadir un usuario a BBDD.
 * 
 */
function _insert(parameters, callback) {
    // Primero insertamos el usuario
    db.insert("users", parameters, userSchema, function (error, user) {
        if (error) {
            callback(error, null)
        } else if (user) {
            // Cuando el usuario está insertado generamos el Token
            registerToken.generate(user, function (error) {
                if (error) {
                    callback(error, null);
                } else {
                    callback(null, user);
                }
            });
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
 *    - callback:   Funcion que recibirá una variable error y un objeto con los datos del usuario.
 * 
 * Funcionamiento:
 *    Dados usuario y contraseña, o access_token, se busca en BBDD dicho usuario.
 * 
 */
function login(email, pass, token, callback) {
    token = (token) ? token : getToken(email, pass);
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
 *    - parameters:     Parámetros de creación de usuario.
 *    - callback:       Funcion que recibirá una variable error y un objeto con los datos del nuevo usuario.
 * 
 * Funcionamiento:
 *    Dados unos parámetros, se mira si son únicos y se introducen en BBDD.
 * 
 */
function register(parameters, callback) {
    var user = createUser(parameters);
    if (user) {
        // Comprobamos si hay algún usuario con estos parámetros
        var getQuery = [{
            email: ["=", user.email]
        }];
        _get(getQuery, function (err, result) {
            if (err) {
                callback(err, null);
            } else if (result && result[0]) {
                callback(new Error("PAR_INUSE", null));
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
        callback(new Error("PAR_MISSING"), null)
    }
}

function modify(access_token, parameters, callback) {
    var query = [{
        "access_token": ["=", access_token]
    }];
    db.update("users", query, parameters, userSchema, function (error, result) {
        if (error) {
            callback(error, null);
        } else {
            callback(null, result);
        }
    })
}

function activate(access_token, callback) {
    var user = {
        "isVerified": true
    };
    modify(access_token, user, function (error, result) {
        if (error) {
            callback(error, null);
        } else {
            callback(null, result);
        }
    });
}

function askResetToken(email, callback) {
    var getQuery = [{
        email: ["=", email]
    }];
    _get(getQuery, function (error, result) {
        if (error) {
            callback(error, null);
        } else if (result[0]) {
            passwordToken.generate(result[0], function (error, result) {
                if (error) {
                    callback(error, null);
                } else {
                    callback(null, result)
                }
            });
        } else {
            callback(new Error(), null);
        }
    })
}

function resetPassword(token, newPassword, callback) {
    passwordToken.check(token, function (error, result) {
        if (error) {
            callback(error, null);
        } else {
            var newParams = {
                access_token: getToken(result.email, newPassword)
            };
            modify(result.access_token, newParams, function (error, result) {
                if (error) {
                    callback(error, null);
                } else {
                    callback(null);
                }
            });
        }
    });
}

module.exports = {
    //get: get,
    login: login,
    //insert: insert,
    register: register,
    activate: activate,
    askResetToken: askResetToken,
    resetPassword: resetPassword
}