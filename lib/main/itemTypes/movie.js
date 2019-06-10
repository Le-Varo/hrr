/**
 * Implementación del módulo de búsqueda externa de videojuegos
 *
 * Dependecias:
 *    - request ->  Módulo de peticiones http.
 *  
 *  Propias:
 *    - config -> Módulo de gestión de la configuración.
 * 
 * Funcionamiento:
 *      El módulo implementa el método de búsqueda externo de videojuegos.
 * 
 * Útima modificación:  10/06/2019
 * Autor/es:            Alvaro Colomo
 * 
 */

/* Carga de dependencias */
const request = require("request");

const config = require("../config.js").getVideoTypeConfig();

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
        url: encodeURI("http://www.omdbapi.com/?apikey=" + config.apiKey + "&s=" + query + "&type=movie"),
        method: "GET"
    }
    request(options, function (err, result) {
        if (err) {
            callback(err, null);
        } else {
            var toReturn = [];
            var ids = [];
            JSON.parse(result.body).Search.forEach(function (elem) {
                ids.push(elem.imdbID);
            });
            var count = ids.length;
            ids.forEach(function (id) {
                options.url = "http://www.omdbapi.com/?apikey=" + config.apiKey + "&i=" + id + "&plot=full";
                request(options, function (err, result) {
                    if (err) {
                        callback(err, null);
                    } else {
                        var item = JSON.parse(result.body);
                        var movie = {
                            title: item.Title,
                            date: item.Released,
                            runtime: item.Runtime,
                            genre: item.Genre,
                            director: item.Director,
                            writer: item.Writer,
                            actors: item.Actors,
                            description: item.Plot,
                            img: item.Poster,
                            rating: item.imdbRating,
                            production: item.Production
                        }
                        toReturn.push(movie);
                        count -= 1;
                        if (count === 0) {
                            callback(null, toReturn);
                        }
                    }
                });
            });
        }
    });
}

module.exports = search;