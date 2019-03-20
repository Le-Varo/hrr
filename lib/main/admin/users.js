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
    collections: []
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
function get(query, callback) {
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
    }]
    get(query, function (error, user) {
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
    //get: get,
    login: login
}