/**
 * Implementación del módulo de búsqueda externa de videojuegos
 *
 * Dependecias:
 *    - request -> Módulo de peticiones http.
 *    - cheerio -> Módulo de parseo de xml.
 *  
 *  Propias:
 *    - config -> Módulo de gestión de la configuración.
 * 
 * Funcionamiento:
 *      El módulo implementa el método de búsqueda externo de videojuegos.
 * 
 * Útima modificación:  06/06/2019
 * Autor/es:            Alvaro Colomo
 * 
 */

/* Carga de dependencias */
const request = require("request");
const cheerio = require("cheerio");

const config = require("../config.js").getVideoGameTypeConfig();

/**
 * Función principal de búsqueda de videojuegos,
 * 
 * Entrada:
 *    - query:     Parámetros de búsqueda de videojuegos.
 *    - callback:  Funcion que recibirá una variable error y un objeto con los datos de los videojuegos encontrados.
 * 
 * Funcionamiento:
 *    Dados unos parámetros, se mira si son únicos y se introducen en BBDD.
 * 
 */
function search(query, callback) {
    var options = {
        url: encodeURI("https://www.giantbomb.com/api/search/?api_key=" + config.apiKey + "&query=" + query + "&resources=game&format=json"),
        method: "GET",
        headers: {
            'User-Agent': 'request'
        }
    }
    request(options, function (err, result) {
        if (err) {
            callback(err, null);
        } else {
            var toReturn = [];
            JSON.parse(result.body).results.forEach(function (result) {
                var platforms = [];
                result.platforms.forEach(function (platform) {
                    platforms.push(platform.name);
                });
                var videogame = {
                    name: result.name,
                    description: result.deck,
                    platforms: platforms.join(", "),
                    date: new Date(result.original_release_date),
                    img: result.image.super_url,
                    thumbnail: result.image.small_url
                }
                toReturn.push(videogame);
            });
            callback(null, toReturn);
        }
    });
}

module.exports = search