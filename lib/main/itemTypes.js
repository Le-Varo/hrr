/**
 * Implementación del módulo de gestión de tipado de items
 *
 * Dependecias:
 *    - fs      -> Módulo de interacción con el sistema de archivos.
 *    - path    -> Módulo que proviene utilidades para interactuar con el directorio de archivos.
 *  
 * Funcionamiento:
 *      El módulo implementa los métodos empleados para la administración del tipado de items.
 * 
 * Útima modificación:  06/06/2019
 * Autor/es:            Alvaro Colomo
 * 
 */

/* Carga de dependencias */
const fs = require("fs");
const path = require("path");

var types = {
    // "videogame", "book", "tvseries", "movie", "boardgame"
}

/**
 * Función principal de recuperación de tipos de items
 * 
 * Salida:
 *    Nombre de los diferentes tipos
 * 
 * Funcionamiento:
 *    Busca en la carpeta de itemTypes los distintos tipos de items existentes y los requiere.
 * 
 */
function getAvaiableItemTypes() {
    if (Object.keys(types).length === 0) {
        var types_path = path.join(__dirname, "itemTypes");
        var files = fs.readdirSync(types_path).
        filter(function (elem) { // filtramos los que sean archivos JS
            return elem.endsWith(".js");
        }).
        map(function (elem) { // Limpiamos la extensión para coger el nombre
            return elem.slice(0, elem.length - 3);
        });
        files.forEach(function (mod) {
            types[mod] = require(path.join(types_path, mod));
        })
    }
    return Object.keys(types);
}

/**
 * Función principal de búsqueda de objetos de cierto tipo
 * 
 * Entrada:
 *    - query:      Parametros de búsqueda.
 *    - type:       Tipo de objeto a buscar.
 *    - callback:   Funcion que recibirá una variable error y un objeto con los datos de los objetos encontrados.
 * 
 * Funcionamiento:
 *    Dados unos parámetros, se mira si son únicos y se introducen en BBDD.
 * 
 */
function search(query, type, callback) {
    if (types[type]) {
        types[type](query, function (error, result) {
            if (error) {
                callback(error, null);
            } else {
                callback(null, result);
            }
        });
    } else {
        callback(new Error(METH_NOTFOUND), null);
    }
}

/* Funciones a exportar */
module.exports = {
    getAvaiableItemTypes: getAvaiableItemTypes,
    search: search
}