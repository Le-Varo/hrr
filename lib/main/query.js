/**
 * Módulo de creación y explotación de queries interno.
 *
 * Dependecias:
 *    - Querystring	-> Generar string
 *
 *
 * Funcionamiento:
 *    El módulo se encarga de abstraer las queries de búsqueda.
 *
 * Útima modificación:  20/03/2019
 * Autor/es:            Jesús Alcalde
 *
 */

/* Carga de dependencias */
var querystring = require('querystring');

/**
 * Función auxiliar de escape de un string
 *
 * Entrada:
 *    - querystr:    String a escapar.
 *
 * Salida:
 * 	  - result: 	 String escapado
 *
 * Funcionamiento:
 *    Recorre el string caracter a caracter escapando lo que cree conveniente (expacios y comas), excepto si están dentro de " "
 *
 */
function escape(querystr) {

    querystr = (querystr) ? querystr : "";

    var result = "";

    var inQuotes = false;
    var inBrackets = false;

    for (var i = 0; i < querystr.length; i++) {

        inQuotes = (querystr[i] == '"') ? !inQuotes : inQuotes;

        if (inQuotes && querystr[i] == ' ') {
            result += '%20';
        } else if (inQuotes && querystr[i] == ',') {
            result += '%2C';
        } else if (inQuotes && querystr[i] == '(') {
            result += '%28';
        } else if (inQuotes && querystr[i] == ')') {
            result += '%29';
        } else if (querystr[i] != '"') {
            result += querystr[i];
        }
    }

    querystr = result;
    result = "";

    for (var i = 0; i < querystr.length; i++) {
        inBrackets = ((!inBrackets && querystr[i] == '(') || inBrackets && querystr[i] != ')');

        if (inBrackets && querystr[i] == '(') {
            result += '|';
        } else if (inBrackets && querystr[i] == ',') {
            result += ';';
        } else if (querystr[i] == ')') {

            if (querystr[i + 1] == '*') {
                result += ';|';
            } else {
                result += '|';
            }
        } else if (querystr[i] != '*') {
            result += querystr[i];
        }
    }

    return result;
}

/**
 * Función auxiliar que extrae las palabras de un string
 *
 * Entrada:
 *    - querystr:    String a escapar.
 *
 * Salida:
 * 	  - toReturn: 	 Array resultado de separar las palabras del string
 *
 * Funcionamiento:
 *    Separa las palabras dependiendo si son AND (" ") o OR (","). La estructura final es un Array de Arrays,
 *    siendo los Arrays internos las palabras eparadas por espacios y los externos las frases separadas por comas.
 *
 */
function getWordsFrom(querystr) {

    querystr = escape(querystr);

    var toReturn = [];

    var split = querystr.split(",");

    for (var a in split) { // Consulta las palabras separadas por comas (OR)
        var aux = [];
        var a_split = split[a].split("|");

        for (var b in a_split) {

            var bracketWord = a_split[b];
            if (bracketWord.lastIndexOf(";") > -1) {

                var temp = [];

                var b_split = a_split[b].split(";");

                if (aux.length === 0) {
                    aux = b_split;
                } else {
                    for (var c in b_split) {

                        aux.forEach(function (word) {
                            if (word != " ") {
                                temp.push(word + b_split[c]);
                            }
                        });

                    }
                    aux = temp;
                }
            } else if (bracketWord.length > 0) {
                var temp = [];
                if (aux.length === 0) {
                    aux.push(bracketWord);
                } else {
                    aux.forEach(function (word) {
                        if (word != " ") {
                            temp.push(word + bracketWord);
                        }
                    });
                    aux = temp;
                }
            }
        }
        aux.forEach(function (word) {
            toReturn.push(word);
        });
        aux = [];
    }

    var temp = toReturn;
    toReturn = [];
    temp.forEach(function (word) {
        aux = [];
        var c_split = word.split(" ");
        for (var d in c_split) { // Consulta las palabras separadas por espacio (AND)
            var w = c_split[d];

            if (w.length > 0) {
                aux.push(querystring.unescape(w));
            }

        }
        if (aux.length > 0) {
            toReturn.push(aux);
        }

    });

    return (toReturn.length == 0) ? [
        []
    ] : toReturn;
}

/* Funciones a exportar */
module.exports = function (querystr) {

    /* Devuelve el array de palabras */
    this.getWords = function () {
        return this._words;
    };
    /* Deveulve la query original */
    this.getQuery = function () {
        return this._querystr;
    };

    /**
     * Comprueba si una palabra es reservada
     * TODO: Generar un objeto de tipo Palabra, esta es la que tiene que contener el método.
     *
     **/
    this.isReserved = function (word) {

        var minus = (word.lastIndexOf("-", 0) > -1) ? 1 : 0;

        var reserved = this.RESERVED_VERBS.some(function (elem) {
            return word.toUpperCase().lastIndexOf(elem) === minus;
        });

        return reserved;

    };

    /* Elimina las palabras reservadas */
    this.cleanReserved = function (word) {
        var toReturn = word.toUpperCase();

        for (var i in this.RESERVED_VERBS) {
            toReturn = toReturn.replace(this.RESERVED_VERBS[i], "");
        }

        return toReturn;
    };

    this._querystr = querystr; // query original
    this._words = getWordsFrom(querystr); // Array de palabras

    this.RESERVED_VERBS = ["FROM:", "SOURCE:", "TO:", "TYPE:", "LANG:", "LINK:"]; // Palabras reservadas
};