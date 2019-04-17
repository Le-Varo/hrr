/**
 * Módulo de gestión de la configuración
 * 
 * Dependencias:
 *    - nconf -> Permite una gestion de la configuración más completa;
 * 
 * Funcionamiento:
 *    El módulo hace de intermediario y abstrae cómo se gestionan las variables de 
 *    configuración, ya sea a través de base de datos o a traves de un archivo JSON,
 *    como es el caso.
 * 
 * Útima modificación:  20/03/2019
 * Autor/es:            Alvaro Colomo
 * 
 */

/* Carga de dependencias */
const nconf = require('nconf');

nconf.argv().env(); // Primero tiene en cuenta los argumentos y luego las variables del entorno.

nconf.file({
    file: './config.json'
}); // En último lugar el archivo config.json (en la raiz del programa)

nconf.defaults({ // Estos son los valores por defecto, si alguno de estos campos no esta incluido en config.json
    'database': { // Lo cargara con lo valor por defecto.
        'engine': 'mongoDB',
        'host': 'localhost',
        'port': 3306,
        'user': '',
        'pass': '',
        'db': '',
        'limit': 100
    },
    'lang': 'ES-es',
});

/**
 * Funciones a exportar 
 * 
 * Dada su simplicidad, se comentan en una linea.
 */
module.exports = {
    getDatabaseConfig: function () { // Devuelve la configuración relativa a la base de datos
        return nconf.get('database');
    },
    getLang: function () { // Devuelve la configuración relativa al idioma
        return nconf.get('lang');
    },
    setLang: function (newLang) { // Cambia la configuración del idioma
        return nconf.set('lang', newLang);
    },
    getAll: function () { // Devuelve toda la configuración
        return nconf.get();
    },
};