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
 * Útima modificación:  21/05/2019
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
    // Busca en BBDD
    select: function (table, obj, schema, /*order, limit, offset, count, mid_functions,*/ callback) {

        // mid_functions = (mid_functions) ? mid_functions : [];

        connection.select(table, obj, schema, /*order, limit, offset, count,*/ function (error, result) {
            if (error) {
                callback(error, result);
            } else {
                var results = result;

                // if (!count) {
                //     mid_functions.forEach(function (funct) {
                //         results = results.map(funct);
                //     });
                // }
                callback(null, results);
            }
        });
    }
};