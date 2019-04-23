/**
 * Implementación del módulo auxiliar de envío de correos
 * 
 * Dependecias:
 *    - google	    -> Implementación de apis de google;
 *    - nodemailer  -> Implementación de envío de mensajes
 * 
 * Propias:
 *    - config  -> Gestión de la configuración
 * 
 * Funcionamiento:
 *      El módulo implementa los métodos empleados para la administración de token de registro, 
 *      como pueden ser la generación, validación de usuarios, regenerar tokens...
 * 
 * Útima modificación:  23/04/2019
 * Autor/es:            Alvaro Colomo
 * 
 */

/* Carga de dependencias */
const google = require("googleapis");
const nodemailer = require("nodemailer");

const config = require("../main/config.js");

const OAuth2 = google.google.auth.OAuth2;


/**
 * Función principal de envío de correos
 * 
 * Entrada:
 *    - mailOptions:    Parámetros del correo.
 *    - callback:       Función que devolverá los errores que se produzcan o null si todo ha ido bien
 * 
 * Funcionamiento:
 *    Se crea un transporte smtp para mandar un correo con las opciones suministradas.
 * 
 */
function sendMail(mailOptions, callback) {
    var mailConfig = config.getMailConfig();
    var oauth2Client = new OAuth2(
        mailConfig.auth.clientId,
        mailConfig.auth.clientSecret,
        "https://developers.google.com/oauthplayground", // Redirect URL
    );
    oauth2Client.setCredentials({
        refresh_token: mailConfig.auth.refreshToken
    });

    var getToken = async () => {
        var tokens = await oauth2Client.getAccessToken()
        console.log(tokens)
        return tokens.Authorization;
    }

    getToken();

    var smtpTransport = nodemailer.createTransport(mailConfig);

    // mailOptions = {
    //     from: mailConfig.auth.user,
    //     to: mailConfig.auth.user,
    //     subject: 'Please confirm your Email account',
    //     html: 'Hello,<br> Please Click on the link to verify your email.<br><a href=http://localhost:3000/verify?id=660d2e2dce5a060d7d2fd1ee6435d67cd2156ce651005c9478889b4b6a88cf09>Click here to verify</a>'
    // }

    smtpTransport.sendMail(mailOptions, function (error, response) {
        if (error) {
            console.log(error)
            callback(error);
        } else {
            console.log("Message sent: " + response.message);
            callback(null);
        }
    });
}

module.exports = {
    sendMail: sendMail
}