/**
 * Abstracción de Base de Datos
 * 
 * Propias:
 *    - config	-> Carga la configuración;
 * 
 * Funcionamiento:
 *    Abstrae las funciones de manipulación de base de datos, y las carga en memoria, 
 *    dependiendo qué motor de BBDD se haya seleccionado en configuración
 * 
 * Útima modificación:  27/05/2019
 * Autor/es:            Alvaro Colomo
 * 
 */

/* Carga de Dependencias */
const config = require('./config.js').getDatabaseConfig();

var connection = require('./database/' + config.engine + '.connector.js');

module.exports = {
    //  Inserta en BBDD
    insert: function (table, obj, schema, callback) {
        connection.insert(table, obj, schema, callback);
    },
    //  Elimina de BBDD
    remove: function (table, obj, schema, callback) {
        connection.remove(table, obj, schema, callback);
    },
    // Actualiza en BBDD
    update: function (table, query, obj2, schema, options, callback) {
        connection.update(table, query, obj2, schema, options, callback);
    },
    // Cuenta resultados en BBDD
    count: function (table, obj, schema, callback) {
        connection.count(table, obj, schema, callback);
    },
    // Busca en BBDD
    select: function (table, obj, schema, options, callback) {

        connection.select(table, obj, schema, options, function (error, result) {
            if (error) {
                callback(error, result);
            } else {
                var results = result;
                callback(null, results);
            }
        });
    }
};