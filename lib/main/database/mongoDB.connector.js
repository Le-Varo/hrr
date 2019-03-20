const mongoose = require('mongoose');
const config = require("../config.js").getDatabaseConfig();

// Seteo de la URL de la BBDD
var mongoURL = process.env.MONGODB_URI || "mongodb://" + config.user + ":" + config.pass + "@ds161024.mlab.com:61024/heroku_4sq3cl9r";

// Variable que actuará como patrón proxy con los diferentes tipos de modelos de mongoose
var models = {};

// Variable que recoge las funciones de base de datos con sus ajustes
var db = {
    open: function () {
        mongoose.connect(mongoURL, {
            useNewUrlParser: true,
            useCreateIndex: true,
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

function getQuery(queriesArray) {
    var query = {};
    if (queriesArray.length === 1) {
        Object.keys(queriesArray[0]).forEach(function (key) {
            var conditions = queriesArray[0][key];

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
        query = {
            $or: []
        };
        queriesArray.forEach(function (singleQuery) {
            query["$or"].push(getQuery([singleQuery]));
        })
    }
    return query;
}

function select(table, obj, schema, order, limit, offset, count, callback) {
    db.open();

    var query = getQuery(obj);

    if (models[table]) {
        model = models[table];
    } else {
        var mongooseSchema = new mongoose.Schema(schema);
        var model = mongoose.model(table, mongooseSchema);
        models[table] = model;
    }
    model.find(query, function (err, result) {
        db.close();
        if (err) {
            callback(err, null);
        } else {
            callback(null, result);
        }
    });
}

module.exports = {
    //insert: insert,
    //remove: remove,
    //update: update,
    select: select
}