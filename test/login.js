const chai = require('chai');
const chaiHttp = require('chai-http');
const expect = require('chai').expect;

const users = require("../lib/main/admin/users.js");

chai.use(chaiHttp);
const url = 'http://localhost:3000';


describe("Login OK: ", () => {
    var usersCreated = [];

    it("Should login via user pass", (done) => {
        var userToSend = {
            email: Math.random().toString(36).substring(7) + "@localhost.com",
            password: Math.random().toString(36).substring(7),
        }
        chai.request(url)
            .post("/register")
            .send(userToSend)
            .end(function (err, res) {
                // console.log(res.body)
                var user = res.body.user
                usersCreated.push(user.access_token);
                users.activateByAccessToken(user.access_token, function () {
                    chai.request(url)
                        .post("/login")
                        .send(userToSend)
                        .end(function (err, res) {
                            expect(res).to.have.status(200);
                            expect(res.body.user.email).to.be.equal(userToSend.email);
                            done();
                        });
                })
            });
    });
    it("Should login via access_token", (done) => {
        var userToSend = {
            email: Math.random().toString(36).substring(7) + "@localhost.com",
            password: Math.random().toString(36).substring(7),
        }
        chai.request(url)
            .post("/register")
            .send(userToSend)
            .end(function (err, res) {
                // console.log(res.body)
                var user = res.body.user
                usersCreated.push(user.access_token);
                users.activateByAccessToken(user.access_token, function () {
                    chai.request(url)
                        .post("/login")
                        .auth(user.access_token, "")
                        .end(function (err, res) {
                            expect(res).to.have.status(200);
                            expect(res.body.user.access_token).to.be.equal(user.access_token);
                            done();
                        });
                })
            });
    });
    it("Should login via access_token despite user pass", (done) => {
        var userAccessToken, userUserPass;
        var userToSend = {
            email: Math.random().toString(36).substring(7) + "@localhost.com",
            password: Math.random().toString(36).substring(7),
        }
        chai.request(url)
            .post("/register")
            .send(userToSend)
            .end(function (err, res) {
                usersCreated.push(res.body.user.access_token);
                userAccessToken = res.body.user.access_token;

                userToSend = {
                    email: Math.random().toString(36).substring(7) + "@localhost.com",
                    password: Math.random().toString(36).substring(7),
                }
                chai.request(url)
                    .post("/register")
                    .send(userToSend)
                    .end(function (err, res) {
                        usersCreated.push(res.body.user.access_token);
                        userUserPass = res.body.user.access_token;
                        users.activateByAccessToken([res.body.user.access_token, userAccessToken], function () {
                            chai.request(url)
                                .post("/login")
                                .send(userToSend)
                                .auth(userAccessToken, "")
                                .end(function (err, res) {
                                    expect(res).to.have.status(200);
                                    expect(res.body.user.access_token).to.be.equal(userAccessToken);
                                    done();
                                });
                        });
                    });
            });
    });
    // Quitar usuarios introducidos
    after(() => {
        if (usersCreated.length > 0) {
            users.remove(usersCreated, function (err, res) {})
        }
    });
});

// Login usuario existente
// Login usuario existente via access_token
// Login usuario existente con access_token y parametros distintos
// Login usuario no activado
// Login usuario no existente