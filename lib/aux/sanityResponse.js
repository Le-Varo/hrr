/**
 * Implementación del módulo de formateo de salida
 * 
 * 
 * Funcionamiento:
 *      El módulo sanitiza la salida de los módulos, obviando campos que no son relevantes para el usuario
 * 
 * Útima modificación:  04/06/2019
 * Autor/es:            Alvaro Colomo
 * 
 */

/**
 * Función auxiliar de sanitización de respuesta contando con un único objeto
 * 
 * Entrada:
 *    - obj:    Objeto a sanitizar.
 *    - schema: Esquema del objeto a sanitizar
 *    
 * Salida:
 *    obj:      Objeto ya sanitizado, quitando variables que son invisibles al usuario.
 * 
 * Funcionamiento:
 *    La entrada se sanitiza, eliminando variables del objeto que han sido marcadas como invisibles al usuario.
 * 
 */
function sanitySingleObj(obj, schema) {
    Object.keys(schema).forEach(function (key) {
        if (schema[key].hide) {
            obj[key] = undefined;
        }
    });
    return obj;
}

/**
 * Función auxiliar de sanitización de un array de respuesta
 * 
 * Entrada:
 *    - obj:    Objeto a sanitizar.
 *    - schema: Esquema del objeto a sanitizar
 *    
 * Salida:
 *    obj:      Objeto ya sanitizado, quitando variables que son invisibles al usuario.
 * 
 * Funcionamiento:
 *    La entrada se sanitiza, eliminando variables del objeto que han sido marcadas como invisibles al usuario.
 * 
 */
function sanityResponse(obj, schema) {
    if (obj) {
        if (obj.length !== undefined) {
            obj.forEach(function (singleObj) {
                singleObj = sanitySingleObj(singleObj, schema);
            })
        } else {
            obj = sanitySingleObj(obj, schema);
        }
    }
    return obj;
}

/* Funcion a exportar */
module.exports = sanityResponse;