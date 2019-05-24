/**
 * Implementación del módulo de gestión de usuarios
 * 
 * Dependecias:
 *    - crypto	        -> Implementación de funciones criptográficas;
 * 
 * Propias:
 *    - db  	        -> Gestión de base de Datos;
 *    - config          -> Gestión de la configuración
 *    - mailer          -> Gestión de correos
 *    - passwordToken   -> Gestión de los Token de reseteo de contraseñas
 *    - registerToken   -> Gestión de los Token de registro
 * 
 * Funcionamiento:
 *      El módulo implementa los métodos empleados para la administración de usuarios, 
 *      como pueden ser el registro, login, selección, modificación...
 * 
 * Útima modificación:  22/05/2019
 * Autor/es:            Alvaro Colomo
 * 
 */

/* Carga de dependencias */
const crypto = require("crypto");

const db = require("../database.js");
const config = require("../config.js").getUsersConfig();
const mailer = require('../../aux/mailer.js');
const passwordToken = require("./tokens/passwordToken.js");
const registerToken = require("./tokens/registerToken.js");

// Esquema de los atributos de los usuarios
var userSchema = {
    email: {
        type: String,
        unique: true,
        required: true,
        index: true,
        lowercase: true
    },
    nick: {
        type: String,
        default: function () {
            return this.email.split("@")[0];
        }
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
    },
    last_connected: {
        type: Date,
        default: Date.now
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
                singleObj = sanitySingleObj(singleObj);
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
        } else if (result[0] && result[0].isVerified) {
            _modify(access_token, {
                last_connected: Date.now
            }, function (error, res) {
                if (error) {
                    callback(error, null);
                } else {
                    callback(null, sanityResponse(result[0]));
                }
            });
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
        // Comprobamos si existe el usuario
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

/**
 * Función auxiliar de modificación
 * 
 * Entrada:
 *    - access_token:   Access_token del usuario al modificar
 *    - parameters:     Parámetros de modificación de usuario.
 *    - callback:       Funcion que recibirá una variable error y un objeto con los datos del usuario modificado.
 * 
 * Funcionamiento:
 *    Se busca a un usuario mediante un access_token y, dados unos parámetros, se modifica.
 * 
 */
function _modify(access_token, parameters, callback) {
    var query = [{
        "access_token": ["=", access_token]
    }];
    db.update("users", query, parameters, userSchema, function (error, result) {
        if (error) {
            callback(error, null);
        } else {
            callback(null, sanityResponse(result));
        }
    })
}

/**
 * Función principal de actvación de usuarios
 * 
 * Entrada:
 *    - tokenID:        Id del token de registro
 *    - callback:       Funcion que recibirá una variable error y un objeto con los datos del usuario activado.
 * 
 * Funcionamiento:
 *    Se elimina el token de registro y se activa al usuario (isVerified = true).
 * 
 */
function activate(tokenID, callback) {
    // Primero activamos el token (eliminamos de BBDD)
    registerToken.activate(tokenID, function (error, result) {
        if (error) {
            res.error = (knownErrors.hasOwnProperty(error.message)) ? knownErrors[error.message] : knownErrors["VALIDATION_FAILED"];
            next();
        } else {
            // Datos a modificar del usuario
            var user = {
                "isVerified": true
            };
            // Modificamos el usuario
            _modify(result.access_token, user, function (error, result) {
                if (error) {
                    callback(error, null);
                } else {
                    callback(null, result);
                }
            });
        }
    });
}

/**
 * Función principal de petición de token de reseteo de contraseña
 * 
 * Entrada:
 *    - email:      Email del usuario al que hay que resetear la contraseña
 *    - callback:   Funcion que recibirá una variable error y un objeto con los datos del token de reseteo.
 * 
 * Funcionamiento:
 *    Se busca a un usuario mediante un email y se genera el token de registro.
 * 
 */
function askResetToken(email, callback) {
    var getQuery = [{
        email: ["=", email]
    }];
    _get(getQuery, function (error, result) {
        if (error) {
            callback(error, null);
        } else if (result[0] && result[0].isVerified) {
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

/**
 * Función auxiliar de mandado de correo de contraseña cambiada
 * 
 * Entrada:
 *    - user:           Datos del usuario al que mandar el mail
 *    - callback:       Funcion que recibirá una variable error
 * 
 * Funcionamiento:
 *    Se genera el cuerpo del mensaje y se usa el mailer para mandar el correo.
 * 
 */
function sendPasswordChanged(user, callback) {
    var body = "Hello,<br> Your password has been changed. If you did not perfom this action, change your passowrd and contact with your local administrator."
    mailer.sendMail("Password has been changed", user.email, body, function (error) {
        if (error) {
            callback(error);
        } else {
            callback(null);
        }
    });
}

/**
 * Función principal de reseteo de Contraseñas
 * 
 * Entrada:
 *    - tokenID:        ID del token
 *    - newPassword:    Nueva contraseña
 *    - callback:       Funcion que recibirá una variable error y un objeto con los datos del nuevo usuario.
 * 
 * Funcionamiento:
 *    Se busca a un usuario mediante un access_token y, dados unos parámetros, se modifica.
 * 
 */
function resetPassword(tokenID, newPassword, callback) {
    // Primero eliminamos de BBDD el token de reseteo si existe
    passwordToken.check(tokenID, function (error, result) {
        if (error) {
            callback(error, null);
        } else {
            // Habiendo eliminado el token de BBDD, traemos la información del usuario
            var query = [{
                "access_token": ["=", result.access_token]
            }]
            _get(query, function (error, users) {
                if (error) {
                    callback(error, null);
                } else if (result[0] && result[0].isVerified) {
                    var user = users[0];
                    // Generamos un nuevo token
                    var newToken = getToken(user.email, newPassword)
                    var newParams = {
                        "access_token": newToken
                    };
                    // Modificamos el usuario del antiguo access_token con el nuevo access_token
                    _modify(result.access_token, newParams, function (error, result) {
                        if (error) {
                            callback(error, null);
                        } else {
                            // Al haber modificado el usuario, mandamos un mail al usuario notificando el cambio
                            sendPasswordChanged(user, function (error) {
                                if (error) {
                                    callback(error, null);
                                } else {
                                    callback(null, result);
                                }
                            });
                        }
                    });
                } else {
                    callback(new Error(), null);
                }
            });
        }
    });
}

function check(access_token, callback) {
    var query = [{
        "access_token": ["=", access_token]
    }];
    _get(query, function (error, result) {
        if (error) {
            callback(error, null);
        } else if (result[0] && result[0].isVerified) {
            _modify(access_token, {
                last_connected: Date.now
            }, function (error, res) {
                if (error) {
                    callback(error, null);
                } else {
                    callback(null, result[0]);
                }
            });
        } else {
            callback(new Error("UNAUTHORIZED"), null);
        }
    });
}

function get(query, parameters, callback) {
    var words = query.getWords();

    var _query = []; // Inicializamos la busqueda

    for (var i in words) { // Palabras separadas por OR

        var aux = {}; // Variable auxiliar de consulta de nick
        var aux2 = {}; // Variable auxiliar de consulta el email

        if (parameters.after) {
            if (!aux.last_connected) {
                aux.last_connected = [];
            }
            if (!aux2.last_connected) {
                aux2.last_connected = [];
            }
            aux.last_connected.push([">=", parameters.after]);
            aux2.last_connected.push([">=", parameters.after]);
        }
        if (parameters.before) {
            if (!aux.last_connected) {
                aux.last_connected = [];
            }
            if (!aux2.last_connected) {
                aux2.last_connected = [];
            }
            aux.last_connected.push(["<=", parameters.before]);
            aux2.last_connected.push(["<=", parameters.before]);
        }

        for (var j in words[i]) {
            var word = words[i][j]; //Cada una de las palabras

            var op;
            var q;

            if (word.lastIndexOf("-", 0) === 0) { // Si esta negada
                word = word.substr(1);
                op = "!CONTAINS"; // No tiene que estar contenida
            } else {
                op = "CONTAINS"; // Si no esta negada, tiene que estar contenida
            }

            if (!query.isReserved(word)) {

                q = [op, word]; // Se genera el array de la consulta

                if (!aux.nick) {
                    aux.nick = []; // Añadimos el campo nick
                }
                if (!aux2.email) {
                    aux2.email = []; // Añadimos el campo email
                }

                aux.nick.push(q);
                aux2.email.push(q);
            }
        }

        _query.push(aux);
        _query.push(aux2);
    }

    db.select("users", _query, userSchema, /*"!date", null, null, true, */ function (error, result_count) {
        if (error) {
            callback(error, null);
        } else {
            callback(null, sanityResponse(result_count));
            // if (parameters.waitForResults) {
            //     db.select("users", _query, userSchema, "!date", parameters.resultsPerPage, parameters.resultsPerPage * parameters.page, !(parameters.waitForResults), function (error, result) {
            //         if (error) {
            //             callback(error, null);
            //         } else {

            //             var toSend = result_count.concat(result);

            //             callback(null, toSend); // Se realiza la consulta y se devuelven los resultados
            //         }
            //     });
            // } else {
            //     callback(null, result_count); // Se realiza la consulta y se devuelven los resultados
            // }
        }
    });
}

/* Funciones a exportar */
module.exports = {
    check: check,
    get: get,
    login: login,
    //insert: insert,
    register: register,
    activate: activate,
    askResetToken: askResetToken,
    resetPassword: resetPassword
}