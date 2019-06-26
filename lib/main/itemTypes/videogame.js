/**
 * Implementación del módulo de búsqueda externa de videojuegos
 *
 * Dependecias:
 *    - request ->  Módulo de peticiones http.
 *    - cheerio ->  Módulo de parseo de xml.
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

/**
 * Función principal de búsqueda de videojuegos,
 * 
 * Entrada:
 *    - query:      Parámetros de búsqueda de videojuegos.
 *    - parameters: Parámetros de búsqueda.
 *    - callback:   Funcion que recibirá una variable error y un objeto con los datos de los videojuegos encontrados.
 * 
 * Funcionamiento:
 *    Dados unos parámetros, se mira si son únicos y se introducen en BBDD.
 * 
 */

function search(query, parameters, callback) {
    var options = {
        url: encodeURI("https://www.videogamegeek.com/xmlapi2/search?query=" + query + "&type=videogame"),
        method: "GET"
    }
    request(options, function (err, result) {
        if (err) {
            callback(err, null);
        } else {
            var toReturn = [];
            var $ = cheerio.load(result.body);
            var ids = [];
            $("item").each(function (i) {
                var id = $(this).attr("id");
                ids.push(id);
            });
            var count = ids.length;
            ids.forEach(function (id) {
                options.url = "https://www.videogamegeek.com/xmlapi2/thing?id=" + id + "&stats=1";
                request(options, function (err, result) {
                    if (err) {
                        callback(err, null);
                    } else {
                        $ = cheerio.load(result.body);
                        var platforms = [];
                        $("link[type='videogameplatform']").each(function () {
                            platforms.push($(this).attr("value"));
                        });
                        var genre = [];
                        $("link[type='videogamegenre']").each(function () {
                            genre.push($(this).attr("value"));
                        });
                        var theme = [];
                        $("link[type='videogametheme']").each(function () {
                            theme.push($(this).attr("value"));
                        });
                        var boardgame = {
                            name: $("name").first().attr("value"),
                            description: $("description").text(),
                            date: $("releasedate").attr("value"),
                            min_players: $("minplayers").attr("value"),
                            max_players: $("maxplayers").attr("value"),
                            rating: $("average").attr("value"),
                            ranking: $("rank[type=subtype]").attr("value"),
                            complexity: ($("averageweight").attr("value") == '0') ? 'Not Ranked' : $("averageweight").attr("value"),
                            platforms: platforms.join(", "),
                            genre: genre.join(", "),
                            theme: theme.join(", "),
                            developer: $("link[type='videogamedeveloper']").attr("value"),
                            publisher: $("link[type='videogamepublisher']").attr("value"),
                            img: (result.body.indexOf("image") > -1) ? result.body.split("<image>")[1].split("</image>")[0] : undefined,
                            img_small: $("thumbnail").text(),
                        }
                        Object.keys(boardgame).forEach(function (key) {
                            if (boardgame[key] === undefined || boardgame[key] === "" || boardgame[key] === "0") {
                                delete boardgame[key];
                            }
                        });
                        toReturn.push(boardgame);
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

module.exports = search