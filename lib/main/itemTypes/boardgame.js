/**
 * Implementación del módulo de búsqueda externa de juegos de mesa
 *
 * Dependecias:
 *    - request -> Módulo de peticiones http.
 *    - cheerio -> Módulo de parseo de xml.
 *  
 * Funcionamiento:
 *      El módulo implementa el método de búsqueda externo de juegos de mesa.
 * 
 * Útima modificación:  06/06/2019
 * Autor/es:            Alvaro Colomo
 * 
 */

/* Carga de dependencias */
const request = require("request");
const cheerio = require("cheerio");

/**
 * Función principal de búsqueda de juegos de mesa,
 * 
 * Entrada:
 *    - query:     Parámetros de búsqueda de juegos de mesa.
 *    - callback:  Funcion que recibirá una variable error y un objeto con los datos de los juegos de mesa encontrados.
 * 
 * Funcionamiento:
 *    Dados unos parámetros, se mira si son únicos y se introducen en BBDD.
 * 
 */
function search(query, callback) {
    var options = {
        url: encodeURI("http://www.boardgamegeek.com/xmlapi2/search?query=" + query + "&type=boardgame"),
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
                options.url = "http://www.boardgamegeek.com/xmlapi2/thing?id=" + id + "&stats=1";
                request(options, function (err, result) {
                    if (err) {
                        callback(err, null);
                    } else {
                        $ = cheerio.load(result.body);
                        var categories = [];
                        $("link[type='boardgamecategory']").each(function () {
                            categories.push($(this).attr("value"));
                        });
                        var mechanics = [];
                        $("link[type='boardgamemechanic']").each(function () {
                            mechanics.push($(this).attr("value"));
                        });
                        var families = [];
                        $("link[type='boardgamefamily']").each(function () {
                            families.push($(this).attr("value"));
                        });
                        var boardgame = {
                            name: $("name").first().attr("value"),
                            description: $("description").text(),
                            date: $("yearpublished").attr("value"),
                            min_players: $("minplayers").attr("value"),
                            max_players: $("maxplayers").attr("value"),
                            playingtime: $("playingtime").attr("value"),
                            min_age: $("minage").attr("value"),
                            rating: $("average").attr("value"),
                            ranking: $("rank[type=subtype]").attr("value"),
                            complexity: ($("averageweight").attr("value") == '0') ? 'Not Ranked' : $("averageweight").attr("value"),
                            categories: categories.join(", "),
                            mechanics: mechanics.join(", "),
                            families: families.join(", "),
                            img: result.body.split("<image>")[1].split("</image>")[0],
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

module.exports = search;