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
 * Útima modificación:  22/05/2019
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
    "=": function (data, negated) {
        var toReturn = data;
        if (negated) {
            toReturn = {
                $ne: data
            }
        }
        return toReturn;
    },
    "<": function (data, negated) {
        var toReturn = {
            "$lt": data
        };
        if (negated) {
            toReturn = {
                $not: toReturn
            }
        }
        return toReturn;
    },
    "<=": function (data, negated) {
        var toReturn = {
            "$lte": data
        };
        if (negated) {
            toReturn = {
                $not: toReturn
            }
        }
        return toReturn;
    },
    ">": function (data, negated) {
        var toReturn = {
            "$gt": data
        };
        if (negated) {
            toReturn = {
                $not: toReturn
            }
        }
        return toReturn;
    },
    ">=": function (data, negated) {
        var toReturn = {
            "$gte": data
        };
        if (negated) {
            toReturn = {
                $not: toReturn
            }
        }
        return toReturn;
    },
    "CONTAINS": function (data, negated) {
        var toReturn = new RegExp(eval("/" + data + "/"));
        if (negated) {
            toReturn = {
                $ne: data
            }
        }
        return toReturn;
    },
    "ENDS": function (data, negated) {
        var toReturn = new RegExp(eval("/" + data + "$/"));
        if (negated) {
            toReturn = {
                $ne: data
            }
        }
        return toReturn;
    },
    "STARTS": function (data, negated) {
        var toReturn = new RegExp(eval("/^" + data + "/"));
        if (negated) {
            toReturn = {
                $ne: data
            }
        }
        return toReturn;
    },
    "NULL": function (data, negated) {
        return {
            $exists: !negated
        }
    },
}

/**
 * Función auxiliar de proxyficación de los Modelos de mongoose
 * 
 * Entrada:
 *    - table:  Nombre de la tabla a obtener
 *    - schema: Esquema de Mongoose del objeto
 * 
 * Salida:
 * 	  - Model: Objeto de modelo de mongoose
 * 
 * Funcionamiento:
 *    Proxy de modelos, para no destruir y crear cada vez que se hace una consulta
 * 
 */
function proxyModelBySchema(table, schema) {
    var Model;
    // Si el modelo se ha usado ya, está guardado en models
    if (models[table]) {
        Model = models[table];
    } else {
        var mongooseSchema = new mongoose.Schema(schema);
        mongooseSchema.set('versionKey', false);
        Model = mongoose.model(table, mongooseSchema);
        // Después de usar el modelo, se guarda en models
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
                    var negated = false;

                    // Si comienza por '!' es que esta negado.
                    if (operator.lastIndexOf("!", 0) === 0) {
                        // Eliminamos el '!'
                        operator = operator.substr(1);
                        negated = true;
                    }

                    // Inicializamos
                    query[key] = (query[key]) ? query[key] : {};

                    Object.assign(query[key], operators[operator](data, negated));
                });
            } else {
                var operator = conditions[0];
                var data = conditions[1];
                var negated = false;

                // Si comienza por '!' es que esta negado.
                if (operator.lastIndexOf("!", 0) === 0) {
                    // Eliminamos el '!'
                    operator = operator.substr(1);
                    negated = true;
                }

                // Inicializamos
                query[key] = (query[key]) ? query[key] : {};

                query[key] = operators[operator](data, negated);
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

/**
 * Función principal de insertado
 * 
 * Entrada:
 *    - table:      Dónde se va a crear.
 *    - obj:        Objeto a insertar.
 *    - schema:     Esquema del objeto que se va a insertar.
 *    - callback:   Funcion que recibira una variable error y un array de objetos con los resultados insertados.
 *  
 * Funcionamiento:
 *    Se inserta un objeto en BBDD.
 * 
 */
function insert(table, obj, schema, callback) {
    db.open(function () {
        var Model = proxyModelBySchema(table, schema);
        var newObj = new Model(obj);
        newObj.save(function (err, returnObj) {
            db.close();
            if (err) {
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

/**
 * Función principal de eliminación
 * 
 * Entrada:
 *    - table:      Dónde se va a consultar.
 *    - query:      Objeto de consulta. Objeto con queries en noSQL.
 *    - schema:     Esquema del objeto que se va a consultar.

 *    - callback:   Funcion que recibira una variable error y un array de objetos con los resultados eliminados.
 *  
 * Funcionamiento:
 *    Realiza una query en Base de datos de consulta según el objeto que se le pase.
 * 
 */
function remove(table, query, schema, callback) {
    // Traemos de base de datos los objetos que cumplen la query para luego devolverlos
    select(table, query, schema, /*null,null,null,null */ function (err, result) {
        if (err) {
            callback(err, null);
        } else if (result[0]) {
            // Si hay al menos un resultado, procedemos
            var Model = proxyModelBySchema(table, schema);
            db.open(function () {
                // Eliminamos los objetos que satisfacen la query
                Model.deleteMany(getQuery(query), function (error, res) {
                    if (error) {
                        callback(error, null);
                    } else {
                        db.close();
                        // Devolvemos los objetos traídos anteriormente en el select
                        callback(null, result);
                    }
                })
            });
        } else {
            callback(new Error(), null);
        }
    });
}

/**
 * Función principal de actualización
 * 
 * Entrada:
 *    - table:      Dónde se va a consultar.
 *    - query:      Objeto de consulta. Objeto con queries en noSQL.
 *    - obj:        Nuevos parámetros
 *    - schema:     Esquema del objeto que se va a consultar.
 *    - options:    Opciones de modificación.
 *    - callback:   Funcion que recibira una variable error y un array de objetos con los resultados actualizados.
 *  
 * Funcionamiento:
 *    Realiza una query en Base de datos de consulta según el objeto que se le pase.
 * 
 */
function update(table, query, obj, schema, options, callback) {
    var callback = (typeof (options) === "function") ? options : callback;
    options = (typeof (options) === "object") ? options : {
        upsert: false
    };
    var Model = proxyModelBySchema(table, schema);
    db.open(function () {
        Model.updateMany(getQuery(query), obj, options, function (error, res) {
            if (error) {
                callback(error, null);
            } else {
                // TODO ojo que esto en un futuro puede dar error si la query es compleja
                var mongoQuery = getQuery(query);
                Object.keys(obj).forEach(function (key) {
                    mongoQuery[key] = obj[key];
                })
                Model.find(mongoQuery, function (err, result) {
                    db.close();
                    if (err) {
                        callback(err, null);
                    } else {
                        callback(null, result);
                    }
                });
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