/**
 * Implementación del módulo de búsqueda externa de cartas de fow.
 *
 * Dependecias:
 *    - cheerio     -> Módulo de parseo de html.
 *    - request     -> Módulo de peticiones http.
 *  
 *  Propias:
 *    - config -> Módulo de gestión de la configuración.
 * 
 * Funcionamiento:
 *      El módulo implementa el método de búsqueda externo de cartas de fow.
 * 
 * Útima modificación:  24/06/2019
 * Autor/es:            Alvaro Colomo
 * 
 */

/* Carga de dependencias */
const cheerio = require("cheerio");
const request = require("request");

/**
 * Función principal de búsqueda de comics,
 * 
 * Entrada:
 *    - query:     Parámetros de búsqueda de cartas de fow.
 *    - callback:  Funcion que recibirá una variable error y un objeto con los datos de las cartas de fow encontradas.
 * 
 * Funcionamiento:
 *    Dados unos parámetros, se busca en fowdb las cartas que cumplan.
 * 
 */
function search(query, callback) {
    var options = {
        url: encodeURI("https://www.whakoom.com/search.aspx/Query"),
        // https://www.fowdb.altervista.org/cards?exact=1&format%5B%5D=nwfrt&format%5B%5D=wandr&type%5B%5D=Resonator&attribute%5B%5D=w&quickcast=1
        method: "POST",

    }
}

function getSets(_parameters, callback) {
    var options = {
        url: "https://www.fowdb.altervista.org",
        method: "GET"
    }
    request(options, function (error, response) {
        if (error) {
            callback(error, null);
        } else {
            var toReturn = {};
            var $ = cheerio.load(response.body);
            $("#setcode optgroup").each(function (index, group) {
                var label = $(this).attr("label");
                toReturn[label] = {};
                $(this).find("option").each(function (index, option) {
                    toReturn[label][$(this).attr("value")] = $(this).text();
                });
            });
            callback(null, toReturn);
        }
    })
}

module.exports = search;
module.exports.getSets = getSets;