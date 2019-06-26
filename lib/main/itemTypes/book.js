/**
 * Implementación del módulo de búsqueda externa de libros
 *
 * Dependecias:
 *    - request -> Módulo de peticiones http.
 *  
 * Funcionamiento:
 *      El módulo implementa el método de búsqueda externo de libros.
 * 
 * Útima modificación:  06/06/2019
 * Autor/es:            Alvaro Colomo
 * 
 */

/* Carga de dependencias */
const request = require("request");

/**
 * Función principal de búsqueda de libros,
 * 
 * Entrada:
 *    - query:      Parámetros de búsqueda de libros.
 *    - parameters: Parámetros de búsqueda.
 *    - callback:   Funcion que recibirá una variable error y un objeto con los datos de los libros encontrados.
 * 
 * Funcionamiento:
 *    Dados unos parámetros, se busca externamente libros.
 * 
 */
function search(query, parameters, callback) {
    var options = {
        url: encodeURI("https://www.googleapis.com/books/v1/volumes?q=" + query),
        method: "GET"
    }
    request(options, function (err, result) {
        if (err) {
            callback(err, null);
        } else {
            var toReturn = [];
            JSON.parse(result.body).items.forEach(function (item) {
                var bookData = item.volumeInfo;
                var book = {
                    name: bookData.title,
                    author: bookData.authors.join(","),
                    date: bookData.publishedDate,
                    description: bookData.description,
                    num_pages: bookData.pageCount,
                    categories: bookData.categories.join(","),
                    img_small: bookData.imageLinks.smallThumbnail,
                    img: bookData.imageLinks.thumbnail,
                    language: bookData.language
                }
                if (bookData.industryIdentifiers) {
                    book.isbn_10 = (bookData.industryIdentifiers[0].type === "ISBN_10") ? bookData.industryIdentifiers[0].identifier : bookData.industryIdentifiers[1].identifier;
                    book.isbn_13 = (bookData.industryIdentifiers[0].type === "ISBN_13") ? bookData.industryIdentifiers[0].identifier : bookData.industryIdentifiers[1].identifier;
                }
                toReturn.push(book);
            });
            callback(null, toReturn);
        }
    });
}

/* Funciones a exportar */
module.exports = search;