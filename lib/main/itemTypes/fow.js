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
 * Útima modificación:  26/06/2019
 * Autor/es:            Alvaro Colomo
 * 
 */

/* Carga de dependencias */
const cheerio = require("cheerio");
const request = require("request");

const permitedParams = [
    "set[]", "format[]", "type[]", "rarity[]",
    "attribute[]", "atk-operator", "def-operator",
    "atk", "def", "total_cost[]", "divinity[]",
    "quickcast", "race"
];

const fowUrl = "https://www.fowdb.altervista.org/";

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
function search(query, parameters, toReturn, callback) {
    var urlParameters = {};
    urlParameters.page = parameters.page;

    if (typeof toReturn === "function") {
        callback = toReturn;
        toReturn = [];
        urlParameters.page = 1;
    }
    permitedParams.forEach(function (paramKey) {
        if (typeof parameters[paramKey] !== "undefined") {
            urlParameters[paramKey] = parameters[paramKey];
        }
    });
    urlParameters.exact = 1;
    urlParameters.q = query;

    var url = fowUrl + "api/cards";

    var options = {
        "url": url,
        "method": "GET",
        "qs": urlParameters,
        headers: {
            Connection: 'keep-alive',
            Host: 'www.fowdb.altervista.org'
        }
    }

    request(options, function (error, result) {
        if (error) {
            callback(error, null);
        } else {
            var body = JSON.parse(result.body);
            body.cardsData.forEach(function (cardData) {
                var card = {
                    title: cardData.name,
                    img: fowUrl + cardData.image_path,
                    thumbnail: fowUrl + cardData.thumb_path,
                    code: cardData.code
                };
                toReturn.push(card);
            });
            if (parameters.all) {
                // console.log(toReturn)
                if (body.nextPage) {
                    var newParameters = Object.assign(parameters);
                    newParameters.page = urlParameters.page + 1;
                    search(query, newParameters, toReturn, callback);
                } else {
                    callback(null, toReturn);
                }
            } else {
                callback(null, toReturn);
            }
        }
    });
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
                "set[]": {},
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
                toReturn["set[]"][label] = {};
                $(this).find("option").each(function () {
                    toReturn["set[]"][label][$(this).attr("value")] = $(this).text().trim();
                });
            });
            callback(null, toReturn);
        }
    })
}

module.exports = search;
module.exports.getParameters = getParameters;