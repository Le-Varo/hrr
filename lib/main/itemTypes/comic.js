/**
 * Implementación del módulo de búsqueda externa de comics
 *
 * Dependecias:
 *    - cheerio     -> Módulo de parseo de html.
 *    - puppeteer   -> Módulo de navegador sin pantalla.
 *    - request     -> Módulo de peticiones http.
 *  
 *  Propias:
 *    - config -> Módulo de gestión de la configuración.
 * 
 * Funcionamiento:
 *      El módulo implementa el método de búsqueda externo de comics.
 * 
 * Útima modificación:  24/06/2019
 * Autor/es:            Alvaro Colomo
 * 
 */

/* Carga de dependencias */
const cheerio = require("cheerio");
const puppeteer = require('puppeteer');
const request = require("request");

const config = require("../config.js").getComicTypeConfig();

/**
 * Función auxiliar de generación de cookies.
 * 
 * Entrada:      
 *    - callback:           Funcion que recibirá un array con las cookies.
 * 
 * Funcionamiento:
 *    Se hace la petición de login a whakoom y se generan las cookies para posteriores peticiones.
 * 
 */
async function getCookies(callback) {
    const browser = await puppeteer.launch({
        // headless: false // Para opciones de debug
    });
    var page = await browser.newPage();
    await page.goto('https://www.whakoom.com/login?ReturnUrl=%2fsearch.aspx%2fQuery', {
        waitUntil: 'load'
    });
    await page.type("#txtUser", config.user);
    await page.type("#txtPassword", config.pass);
    var checkbox = await page.$("#chkRecordar");
    var isChecked = await (await checkbox.getProperty('checked')).jsonValue();
    if (!isChecked) {
        await checkbox.click();
    }
    await page.click("#cmdLogin");

    var cookies = await page.cookies();

    await page.close();
    callback(cookies);
}

/**
 * Función auxiliar de recopilación de información de comics.
 * 
 * Entrada:
 *    - comicInfoArray:     Parámetros de entrada con info de los comics parca.
 *    - comicInfoToReturn:  Array de info de comics a devolver. Se irá generando cada iteración.
 *    - index:              Índice de comicInfoArray del que se está recopilando información.          
 *    - callback:           Funcion que recibirá un objeto con los datos de los comics encontrados.
 * 
 * Funcionamiento:
 *    Dado un array con la información básica de los comics, se ampliará con la infromación proporcionada por puppeteer.
 * 
 */
async function getComicInfo(comicInfoArray, comicInfoToReturn, index, callback) {
    // Si es la primera iteración inicializamos las variables
    if (typeof comicInfoToReturn === "function") {
        callback = comicInfoToReturn;
        comicInfoToReturn = [];
        index = 0;
    }
    var actualComic = comicInfoArray[index]

    const browser = await puppeteer.launch({
        // headless: false // Para opciones de debug
    });
    var page = await browser.newPage();
    await page.goto(actualComic.link, {
        waitUntil: 'load'
    });
    var content = await page.content();
    page.close();

    var $ = cheerio.load(content);
    var comic = Object.assign(actualComic);

    if (comic.link.indexOf("/ediciones/") > -1) {
        //TODO  Devolver info de las colecciones
    } else {
        comic.img = $(".comic-cover a").attr("href");
        comic.format = $(".format").text();
        var prize = $("button.on-sale").first().text();
        comic.prize = (prize == "Comprar") ? "" : prize;
        comic.lang = $(".lang-pub span[itemprop='inLanguage']").text();
        comic.edition = $(".lang-pub span[itemprop='name']").text();
        comic.description = $(".wiki-text").text().replace("\nArgumento\n", "");
        comic.authors = $(".authors").text().replace("\nAutores\n", "");
        comic.date = new Date($(".info-item p[itemprop='datePublished']").attr("content"));
        comic.isbn = [];
        $(".barcodes li").each(function () {
            comic.isbn.push($(this).text());
        });
        Object.keys(comic).forEach(function (key) {
            if (comic[key] == "") {
                delete comic[key];
            }
        });
        comicInfoToReturn.push(comic);
    }

    if (index === comicInfoArray.length - 1) {
        callback(comicInfoToReturn);
    } else {
        getComicInfo(comicInfoArray, comicInfoToReturn, index + 1, callback);
    }
}

/**
 * Función principal de búsqueda de comics,
 * 
 * Entrada:
 *    - query:     Parámetros de búsqueda de comics.
 *    - callback:  Funcion que recibirá una variable error y un objeto con los datos de los comics encontrados.
 * 
 * Funcionamiento:
 *    Dados unos parámetros, se busca en whakoom los comics que cumplan.
 * 
 */
function search(query, callback) {
    var options = {
        url: encodeURI("https://www.whakoom.com/search.aspx/Query"),
        method: "POST",
        headers: {
            "Host": "www.whakoom.com",
            "Connection": "keep-alive",
            "Content-Length": 46 + query.length,
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "Origin": "https://www.whakoom.com",
            "X-Requested-With": "XMLHttpRequest",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.80 Safari/537.36",
            "Content-Type": "application/json; charset=UTF-8",
            "Referer": "https://www.whakoom.com/search?s=" + query,
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
            // "Cookie": "ASP.NET_SessionId=32gtbd1cngxaaxm4qpkdvyjd; _ga=GA1.2.1213842554.1541009588; _fbp=fb.1.1549368654560.2030409811; .wk_cookies=1; .WHAKOOMUSER=8A46BE44C9396FA0994CD0D785190591E54E5763B7BB061BF907C7141E2FBEAFF2CD72AF28FAB0F1D3D148504522CC28CA92AB9AF58B84414048A591C8E25B100DBDD981C750BDE6889F64097A8E646FDE42B9F4A16F82EFBEA66026354C983014D97536BA5ED6FC92F7348E691F5A8CFBE92046; _gid=GA1.2.1608945203.1560343295; _gat_UA-40636778-1=1"
        },
        body: JSON.stringify({
            "q": query,
            "ft": 0,
            "fit": "",
            "fp": "",
            "fl": "",
            "p": 1
        })
    }
    getCookies(function (cookies) {
        var cookie = "";
        cookies.forEach(function (cookieValue) {
            cookie += cookieValue.name.replace(" ", "_") + "=" + cookieValue.value + "; ";
        })
        options.headers.Cookie = cookie;
        request(options, function (err, result) {
            if (err) {
                callback(err, null);
            } else {
                var toReturn = [];
                var $ = cheerio.load(result.body);
                var html = JSON.parse(result.body).d.searchResult.toString("utf8");
                var $ = cheerio.load(html);
                $("div.sresult").each(function (i, elem) {
                    var text = $(this).text().split("\n");
                    var comic = {
                        title: text[0],
                        publisher: text[2],
                        rating: $(this).find(".stars-value").text(),
                        thumbnail: $(this).find("img").attr("src"),
                        link: "https://www.whakoom.com" + $(this).find("p a").attr("href")
                    }
                    toReturn.push(comic);
                });

                getComicInfo(toReturn, function (result) {
                    callback(null, result);
                });
            }
        });
    });
}

module.exports = search;