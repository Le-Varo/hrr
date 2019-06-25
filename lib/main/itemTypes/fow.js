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
 * Útima modificación:  25/06/2019
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
 *    - parameters: Parámetros de búsqueda.
 *    - callback:  Funcion que recibirá una variable error y un objeto con los datos de las cartas de fow encontradas.
 * 
 * Funcionamiento:
 *    Dados unos parámetros, se busca en fowdb las cartas que cumplan.
 * 
 */
function search(query, parameters, callback) {
    var options = {
        url: encodeURI("https://www.fowdb.altervista.org/api/cards?"),
        // https://www.fowdb.altervista.org/cards?exact=1&format%5B%5D=nwfrt&format%5B%5D=wandr&type%5B%5D=Resonator&attribute%5B%5D=w&quickcast=1
        method: "POST",

    }
}

function getParameters(_parameters, callback) {
    var options = {
        url: "https://www.fowdb.altervista.org",
        method: "GET"
    }
    request(options, function (error, response) {
        if (error) {
            callback(error, null);
        } else {
            var toReturn = {
                "sets": {},
                "format[]": {},
                "type[]": {},
                "rarity[]": {
                    "c": "Common",
                    "u": "Uncommon",
                    "r": "Rare",
                    "sr": "Super Rare",
                    "s": "Secret",
                    "ar": "Ascension"
                },
                "attribute[]": {
                    "w": "White",
                    "r": "Red",
                    "u": "Blue",
                    "g": "Green",
                    "b": "Black",
                    "no": "No color",
                    "no_attribute_multi": "No Multi-Attribute",
                    "attribute_multi": "Only Multi-Attribute",
                    "attribute_selected": "Must contain just selected"
                },
                "atk-operator": {
                    "lessthan": "<",
                    "greaterthan": ">",
                    "equals": "="
                },
                "def-operator": {
                    "lessthan": "<",
                    "greaterthan": ">",
                    "equals": "="
                },
                "atk": {},
                "def": {},
                "total_cost[]": {},
                "divinity[]": {},
                "quickcast": {},
                "race": {},
            };

            var $ = cheerio.load(response.body);

            ["format[]", "type[]"].forEach(function (item, index) {
                if (item !== "") {
                    $("#hide-filters > div > div.panel-body > div > div:nth-child(1) > div:nth-child(" + (index + 2) + ")").find("label").each(function () {
                        toReturn[item][$(this).find("input").attr("value")] = $(this).text().trim();
                    })
                }
            })
            $("#setcode optgroup").each(function () {
                var label = $(this).attr("label");
                toReturn.sets[label] = {};
                $(this).find("option").each(function () {
                    toReturn.sets[label][$(this).attr("value")] = $(this).text().trim();
                });
            });
            callback(null, toReturn);
        }
    })
}

module.exports = search;
module.exports.getParameters = getParameters;