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
 * Función auxiliar de recopilación de información de cartas.
 * 
 * Entrada:
 *    - comicInfoArray:     Parámetros de entrada con info de los cartas parca.
 *    - comicInfoToReturn:  Array de info de cartas a devolver. Se irá generando cada iteración.
 *    - index:              Índice de comicInfoArray del que se está recopilando información.          
 *    - callback:           Funcion que recibirá un objeto con los datos de los cartas encontrados.
 * 
 * Funcionamiento:
 *    Dado un array con la información básica de los cartas, se ampliará con la infromación proporcionada por request.
 * 
 */
function getCardInfo(cardInfoArray, cardInfoToReturn, index, callback) {
    // Si es la primera iteración inicializamos las variables
    if (typeof cardInfoToReturn === "function") {
        callback = cardInfoToReturn;
        cardInfoToReturn = [];
        index = 0;
    }
    var actualCard = cardInfoArray[index];
    var options = {
        "url": fowUrl + "card/" + actualCard.code,
        "method": "GET",
    }
    request(options, function (error, result) {
        if (error) {
            callback(error, null);
        } else {
            var $ = cheerio.load(result.body);
            // Por cada página de cartas, esto es por los ruler/ jruler
            $(".cardpage").each(function () {
                var cardToFillUp = {}
                // Por cada atributo, lo parseamos
                $(this).find("div.prop-label").each(function () {
                    var label_text = $(this).text().trim();
                    var prop_value = $(this).siblings().first();
                    if (label_text === "Name") {
                        cardToFillUp.title = prop_value.text().trim();
                    } else if (label_text === "Type") {
                        cardToFillUp.type = prop_value.text().trim().split(" / ");
                    } else if (label_text === "Cost") {
                        cardToFillUp.cost = "";
                        prop_value.find("img").each(function () {
                            cardToFillUp.cost += $(this).attr("alt");
                        });
                        cardToFillUp.cost += prop_value.text().trim();
                    } else if (label_text === "Total Cost") {
                        cardToFillUp.total_cost = prop_value.text().trim();
                    } else if (label_text === "Atk Def") {
                        var atk_def = prop_value.text().trim().split("/");
                        cardToFillUp.atk = atk_def[0];
                        cardToFillUp.def = atk_def[1];
                    } else if (label_text === "Race") {
                        cardToFillUp.race = prop_value.text().trim().split("/");
                    } else if (label_text === "Text") {
                        cardToFillUp.text = prop_value.html().trim();
                    } else if (label_text === "Rarity") {
                        if (prop_value.text().trim() !== "(None)") {
                            cardToFillUp.rarity = $(prop_value).find("a").attr("href").split("rarity[]=")[1];
                        }
                    } else if (label_text === "Set") {
                        cardToFillUp.set = $(prop_value).find("a").attr("href").split("set=")[1];
                    } else if (label_text === "Format") {
                        var formats = [];
                        $(prop_value).find("a").each(function () {
                            var format = $(this).attr("href").split("format[]=")[1];
                            formats.push(format);
                        });
                        cardToFillUp.formats = formats;
                    } else if (label_text === "Divinity") {
                        cardToFillUp.divinity = prop_value.text().trim();
                    }
                });
                cardToFillUp.img = $(this).find("div.box > img").attr("src").split("?")[0];
                cardToFillUp.thumbnail = cardToFillUp.img.replace("images", "thumbs");

                cardInfoToReturn.push(cardToFillUp);
            });
            // Si es el último item se devuelve el conjunto
            if (index == cardInfoArray.length - 1) {
                callback(null, cardInfoToReturn);
            } else {
                //Si no, se procede a parsear el siguiente
                getCardInfo(cardInfoArray, cardInfoToReturn, index + 1, callback);
            }
        }
    });
}

/**
 * Función principal de búsqueda de cartas de fow,
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
            if (toReturn.length > 0) {
                if (parameters.all) {
                    if (body.nextPage) {
                        var newParameters = JSON.parse(JSON.stringify(parameters));
                        newParameters.page = urlParameters.page + 1;
                        search(query, newParameters, toReturn, callback);
                    } else {
                        getCardInfo(toReturn, function (error, result) {
                            if (error) {
                                callback(error, null);
                            } else {
                                callback(null, result);
                            }
                        });
                    }
                } else {
                    getCardInfo(toReturn, function (error, result) {
                        if (error) {
                            callback(error, null);
                        } else {
                            callback(null, result);
                        }
                    });
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