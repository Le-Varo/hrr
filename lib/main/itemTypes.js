/**
 * Implementación del módulo de gestión de tipado de items
 *  
 * Funcionamiento:
 *      El módulo implementa los métodos empleados para la administración del tipado de items.
 * 
 * Útima modificación:  05/06/2019
 * Autor/es:            Alvaro Colomo
 * 
 */

var types = [
    "videogame", "book", "tvseries", "movie", "boardgame"
]

function getAvaiableItemTypes() {
    return types;
}

module.exports = {
    getAvaiableItemTypes: getAvaiableItemTypes
}