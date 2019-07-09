const chai = require('chai');
const chaiHttp = require('chai-http');
const expect = require('chai').expect;
const crypto = require("crypto");

const passwordToken = require("../lib/main/admin/tokens/passwordToken.js");
const users = require("../lib/main/admin/users.js");

chai.use(chaiHttp);
const url = 'http://localhost:3000';


describe("Ask Reset Token OK: ", () => {
    var userCreated = null;
    it("Should generate a Reset Token", (done) => {
        var userToSend = {
            email: Math.random().toString(36).substring(7) + "@localhost.com",
            password: Math.random().toString(36).substring(7),
        }
        chai.request(url)
            .post("/register")
            .send(userToSend)
            .end(function (err, res) {
                // console.log(res.body)
                userCreated = res.body.user
                users.activateByAccessToken(userCreated.access_token, function () {
                    chai.request(url)
                        .post("/askResetToken")
                        .send({
                            email: userCreated.email
                        })
                        .end(function (err, res) {
                            expect(res).to.have.status(200);
                            done();
                        });
                });
            });
    });
    after((done) => {
        passwordToken.check(null, userCreated.access_token, function () {
            users.remove(userCreated.access_token, function (err) {
                done()
            });
        });
    });
});

describe("Reset Token Fails: ", () => {
    it("It should fail if there is no user with that email", (done) => {
        chai.request(url)
            .post("/askResetToken")
            .send({
                email: "fail" + Math.random().toString(36).substring(7) + "@localhost.com"
            })
            .end(function (err, res) {
                expect(res).to.have.status(403);
                done();
            });
    });
});
// Email correcto
// Email incorrecto