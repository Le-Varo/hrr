const chai = require('chai');
const chaiHttp = require('chai-http');
const expect = require('chai').expect;
const crypto = require("crypto");

const config = require("../lib/main/config.js");
const passwordToken = require("../lib/main/admin/tokens/passwordToken.js");
const users = require("../lib/main/admin/users.js");

chai.use(chaiHttp);
const url = 'http://localhost:3000';

describe("Reset Password OK: ", () => {
    var userCreated = null;

    it("Should reset the password of an user", (done) => {
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
                users.activateByAccessToken(user.access_token, function () {
                    passwordToken.generate(user, function (err, token) {
                        var newPassword = Math.random().toString(36).substring(7);
                        chai.request(url)
                            .get("/resetPassword")
                            .query({
                                id: token,
                                newPassword: newPassword
                            })
                            .end(function (err, res) {
                                expect(res).to.have.status(200);
                                userCreated = res.body.updated[0];
                                expect(userCreated.access_token).to.be.equal(users.getToken(user.email, newPassword));
                                done();
                            });
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

describe("Activation Fails: ", () => {
    it("It should fail if there is no new Pass", (done) => {
        var tokenHash = crypto.createHash("sha256").update(crypto.randomBytes(16).toString('hex').concat(config.getTokenConfig().magicWord));
        chai.request(url)
            .get("/resetPassword")
            .query({
                id: tokenHash.digest('hex'),
            })
            .end(function (err, res) {
                expect(res).to.have.status(400);
                done();
            });

    });
    it("It should fail if there is no user to change password", (done) => {
        var fakeUser = {
            email: "fake" + Math.random().toString(36).substring(7) + "@localhost.com"
        }
        fakeUser.access_token = users.getToken(fakeUser.email, Math.random().toString(36).substring(7));

        passwordToken.generate(fakeUser, function (err, token) {
            chai.request(url)
                .get("/resetPassword")
                .query({
                    id: token,
                    newPassword: Math.random().toString(36).substring(7)
                })
                .end(function (err, res) {
                    expect(res).to.have.status(403);
                    done();
                })
        });
    });
    it("It should fail if there is no token", (done) => {
        var tokenHash = crypto.createHash("sha256").update(crypto.randomBytes(16).toString('hex').concat(config.getTokenConfig().magicWord));
        chai.request(url)
            .get("/resetPassword")
            .query({
                id: tokenHash.digest('hex'),
                newPassword: Math.random().toString(36).substring(7)
            })
            .end(function (err, res) {
                expect(res).to.have.status(403);
                done();
            });

    });

});