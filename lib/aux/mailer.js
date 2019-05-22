/**
 * Implementación del módulo auxiliar de envío de correos
 * 
 * Dependecias:
 *    - nodemailer  -> Implementación de envío de mensajes
 * 
 * Propias:
 *    - config  -> Gestión de la configuración
 * 
 * Funcionamiento:
 *      El módulo implementa los métodos empleados para la administración de token de registro, 
 *      como pueden ser la generación, validación de usuarios, regenerar tokens...
 * 
 * Útima modificación:  21/05/2019
 * Autor/es:            Alvaro Colomo
 * 
 */

/* Carga de dependencias */
const nodemailer = require("nodemailer");

const config = require("../main/config.js");

/**
 * Función principal de envío de correos
 * 
 * Entrada:
 *    - subject:    Asunto del mail
 *    - to:         A quien está dirigido el mail        
 *    - body:       Cuerpo del mensaje
 *    - callback:   Función que devolverá los errores que se produzcan o null si todo ha ido bien
 * 
 * Funcionamiento:
 *    Se crea un transporte smtp para mandar un correo con las opciones suministradas.
 * 
 */
function sendMail(subject, to, body, callback) {
    var mailOptions = {
        "to": to,
        "subject": subject,
        "generateTextFromHTML": true,
        "html": body
    }

    var mailConfig = config.getMailConfig();
    var smtpTransport = nodemailer.createTransport(mailConfig);

    mailOptions.from = mailConfig.auth.user;

    smtpTransport.sendMail(mailOptions, function (error, response) {
        if (error) {
            callback(error);
        } else {
            callback(null);
        }
    });
}

module.exports = {
    sendMail: sendMail
}