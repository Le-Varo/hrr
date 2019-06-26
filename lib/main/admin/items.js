/**
 * Implementación del módulo de gestión de items
 * 
 * Dependecias Propias:
 *    - db  	        -> Gestión de base de Datos;
 *    - config          -> Gestión de la configuración
 * 
 * Funcionamiento:
 *      El módulo implementa los métodos empleados para la administración de items, 
 *      como pueden ser la creación, modificación, selección, eliminación...
 * 
 * Útima modificación:  05/06/2019
 * Autor/es:            Alvaro Colomo
 * 
 */

/* Carga de dependencias */
const db = require("../database.js");
// const config = require("../config.js").getItemsConfig();
const sanityResponse = require("../../aux/sanityResponse.js");
const itemTypes = require("../itemTypes.js");

// Esquema de los atributos de los items
var itemSchema = {
    name: {
        type: String,
        required: true
    },
    user: {
        type: String,
        required: true
    },
    type: {
        type: String,
        default: "custom"
    }
}

function createItem(parameters) {
    var item = {};
    var valid = true;
    Object.keys(itemSchema).forEach(function (key) {
        if (itemSchema[key].required && parameters[key] === undefined) {
            valid &= false;
        }
    });
    if (valid) {
        if (parameters.type === undefined || itemTypes.getAvaiableItemTypes().indexOf(parameters.type) == -1) {
            parameters.type = "custom"
        }
        item = Object.assign(parameters);
    }
    return item;
}

/**
 * Función principal de creación de items
 * 
 * Entrada:
 *    - parameters:     Parámetros de creación del item.
 *    - callback:       Funcion que recibirá una variable error y un objeto con los datos del nuevo item.
 * 
 * Funcionamiento:
 *    Dados unos parámetros, se mira si son únicos y se introducen en BBDD.
 * 
 */
function create(user, parameters, callback) {
    parameters.user = user.id;
    var item = createItem(parameters);
    if (item) {
        var options = {
            strict: false
        };
        // Si se ha creado el item adecuadamente lo insertamos
        db.insert("items", item, itemSchema, options, function (error, item) {
            if (error) {
                callback(error, null);
            } else {
                callback(null, sanityResponse(item, itemSchema));
            }
        })
    } else {
        callback(new Error("PAR_MISSING"), null)
    }
}

/* Funciones a exportar */
module.exports = {
    create: create,
    // get: get,
    // modify: modify,
    // remove: remove
}