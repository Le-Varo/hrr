/**
 * Implementación del módulo de bases de datos para MongoDB
 * 
 * Dependecias:
 *    - mongoose-> Interprete de MongoDB;
 * 
 * Propias:
 *    - config	-> Carga la configuración;
 * 
 * Funcionamiento:
 *    El módulo implementa los métodos: insert, remove, update y select correspondientes,
 * 	  siguento con el estandar establecido, para el funcionamiento de MongoDB como motor
 * 	  de bases de datos.
 * 
 * Útima modificación:  21/05/2019
 * Autor/es:            Alvaro Colomo
 * 
 */

/* Carga de Dependencias */
const mongoose = require('mongoose');

const config = require("../config.js").getDatabaseConfig();

// Seteo de la URL de la BBDD
var mongoURL = process.env.MONGODB_URI || "mongodb://" + config.user + ":" + config.pass + "@ds161024.mlab.com:61024/heroku_4sq3cl9r";

// Variable que actuará como patrón proxy con los diferentes tipos de modelos de mongoose
var models = {};

// Variable que recoge las funciones de base de datos con sus ajustes
var db = {
    open: function (callback) {
        mongoose.connect(mongoURL, {
            useNewUrlParser: true,
            useCreateIndex: true,
        });
        mongoose.connection.once('open', function () {
            callback();
        });
    },
    close: function () {
        mongoose.connection.close();
    }
}

// Variable que transforma los operadores del get en queries de mongo
var operators = {
    "=": function (data) {
        return data;
    },
    "<": function (data) {
        return {
            "$lt": data
        };
    },
    "<=": function (data) {
        return {
            "$lte": data
        };
    },
    ">": function (data) {
        return {
            "$gt": data
        };
    },
    ">=": function (data) {
        return {
            "$gte": data
        };
    },
    "CONTAINS": function (data) {
        return new RegExp(eval("/" + data + "/"));
    },
    "ENDS": function (data) {
        return new RegExp(eval("/" + data + "$/"));
    },
    "STARTS": function (data) {
        return new RegExp(eval("/^" + data + "/"));
    },
    "NULL": function (data) {
        return {
            $exists: false
        }
    },
}

function proxyModelBySchema(table, schema) {
    var Model;
    if (models[table]) {
        Model = models[table];
    } else {
        var mongooseSchema = new mongoose.Schema(schema);
        mongooseSchema.set('versionKey', false);
        Model = mongoose.model(table, mongooseSchema);
        models[table] = Model;
    }
    return Model;
}

/**
 * Función auxiliar de obtención de la query de select
 * 
 * Entrada:
 *    - queriesArray: Array con la query de busqueda.
 * 
 * Salida:
 * 	  - object: Objeto de búsqueda para la consulta en MongoDB.
 * 
 * Funcionamiento:
 *    Dada un array con la query de busqueda, construye el objeto de búsqueda de MongoDB.
 * 
 */
function getQuery(queriesArray) {
    var query = {};
    if (queriesArray.length === 1) {
        Object.keys(queriesArray[0]).forEach(function (key) {
            var conditions = queriesArray[0][key];

            // Si hay más de una condición, las analiza
            if (typeof (conditions[0]) === "object") {
                conditions.forEach(function (condition) {
                    var operator = condition[0];
                    var data = condition[1];
                    query[key] = (query[key]) ? query[key] : {};
                    Object.assign(query[key], operators[operator](data));
                });
            } else {
                var operator = conditions[0];
                var data = conditions[1];
                query[key] = (query[key]) ? query[key] : {};
                query[key] = operators[operator](data, query[key]);
            }
        });
    } else if (queriesArray.length !== 0) {
        // si hay más de un objeto en el array, significa que es un OR lógico
        query = {
            $or: []
        };
        queriesArray.forEach(function (singleQuery) {
            query["$or"].push(getQuery([singleQuery]));
        })
    }
    return query;
}

function insert(table, obj, schema, callback) {
    db.open(function () {
        var Model = proxyModelBySchema(table, schema);
        var newObj = new Model(obj);
        newObj.save(function (err, returnObj) {

            db.close();
            if (err) {
                // console.error(err)
                callback(err, null);
            } else {
                callback(null, returnObj);
            }
        })
    });

}

/**
 * Función principal de consulta
 * 
 * Entrada:
 *    - table:      Dónde se va a consultar.
 *    - obj:        Objeto de consulta. Objeto con queries en noSQL.
 *    - schema:     Esquema del objeto que se va a consultar.
 *    - order:      Por qué campo ordenar, con '!' se pude seleccioanr el inverso.
 *    - limit:      Numero de resultados tope a obtener.
 *    - offset:     Numero de resultados obviados.
 *    - count:      Variable booleana que indica si se hace una quey de conteo.
 *    - callback:   Funcion que recibira una variable error y un array de objetos con los resultados.
 *  
 * Funcionamiento:
 *    Realiza una query en Base de datos de consulta según el objeto que se le pase.
 * 
 */
function select(table, obj, schema, /*order, limit, offset, count,*/ callback) {
    db.open(function () {
        var query = getQuery(obj);
        var Model = proxyModelBySchema(table, schema);

        Model.find(query, function (err, result) {
            db.close();
            if (err) {
                callback(err, null);
            } else {
                callback(null, result);
            }
        });
    });
}

function remove(table, obj, schema, callback) {
    select(table, obj, schema, /*null,null,null,null */ function (err, result) {
        if (err) {
            callback(err, null);
        } else if (result[0]) {
            var Model = proxyModelBySchema(table, schema);
            var counter = result.length;
            var toReturn = [];
            db.open(function () {
                result.forEach(function (item) {
                    Model.deleteOne(item).then(function () {
                        toReturn.push(item)
                        counter -= 1;
                        if (counter == 0) {
                            db.close();
                            callback(null, toReturn);
                        }
                    }).catch(function (err) {
                        callback(err, null);
                    })
                });
            });
        } else {
            callback(null, []);
        }
    });
}

function update(table, query, obj, schema, options, callback) {
    var callback = (typeof (options) === "function") ? options : callback;

    var Model = proxyModelBySchema(table, schema);
    db.open(function () {
        Model.updateMany(getQuery(query), obj, options, function (error, res) {
            if (error) {
                callback(error, null);
            } else {
                db.close();
                callback(null, res.nModified);
            }
        });
    });
}

/* Funciones a exportar */
module.exports = {
    insert: insert,
    remove: remove,
    update: update,
    select: select
}