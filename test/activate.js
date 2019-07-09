const chai = require('chai');
const chaiHttp = require('chai-http');
const expect = require('chai').expect;

const registerToken = require("../lib/main/admin/tokens/registerToken.js");
const users = require("../lib/main/admin/users.js");

chai.use(chaiHttp);
const url = 'http://localhost:3000';


describe("Activation OK: ", () => {
    var userCreated = null;
    it("Should activate a user", (done) => {
        var userToSend = {
            email: Math.random().toString(36).substring(7) + "@localhost.com",
            password: Math.random().toString(36).substring(7),
        }
        chai.request(url)
            .post("/register")
            .send(userToSend)
            .end(function (err, res) {
                userCreated = res.body.user;
                console.log(userCreated)
                registerToken.generate(userCreated, function (err, token) {
                    chai.request(url)
                        .get("/activate")
                        .query({
                            id: token
                        })
                        .end(function (err, res) {
                            expect(res).to.have.status(200);
                            done();
                        });
                });
            })
    });
    after((done) => {
        users.remove(userCreated.access_token, function (err) {
            done()
        })
    });
});

describe("Activation Fails: ", () => {
    var userCreated = null;
    it("It should fail if there is no user to activate", (done) => {
        var fakeUser = {
            email: "fake" + Math.random().toString(36).substring(7) + "@localhost.com"
        }
        fakeUser.access_token = users.getToken(fakeUser.email, Math.random().toString(36).substring(7));

        registerToken.generate(fakeUser, function (err, token) {
            chai.request(url)
                .get("/activate")
                .query({
                    id: token
                })
                .end(function (err, res) {
                    console.error(res.body)
                    expect(res).to.have.status(403);
                    done();
                })
        });
    });
});
// Activación sin usuario
// Activación sin ticket