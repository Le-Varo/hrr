//var config = require('./config.js').getDatabaseConfig();
var config = {
    engine: "mongoDB"
}
var connection = require('./database/' + config.engine + '.connector.js');

module.exports = {
    //  Inserta en BBDD
    insert: function (table, obj, schema, callback) {
        connection.insert(table, obj, schema, callback);
    },
    /* Elimina de BBDD*/
    /*remove: function (table, obj, callback) {
        connection.remove(table, obj, callback);
    },
    /* Actualiza en BBDD*/
    /*update: function (table, obj, obj2, callback) {
        connection.update(table, obj, obj2, callback);
    },*/
    // Busca en BBDD
    select: function (table, obj, schema, order, limit, offset, count, mid_functions, callback) {

        mid_functions = (mid_functions) ? mid_functions : [];

        connection.select(table, obj, schema, order, limit, offset, count, function (error, result) {
            if (error) {
                callback(error, result);
            } else {
                var results = result;

                if (!count) {
                    mid_functions.forEach(function (funct) {
                        results = results.map(funct);
                    });
                }
                callback(null, results);
            }
        });
    }
};