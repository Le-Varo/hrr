const chai = require('chai');
const chaiHttp = require('chai-http');
const expect = require('chai').expect;

const registerToken = require("../lib/main/admin/tokens/registerToken.js");
const users = require("../lib/main/admin/users.js");

chai.use(chaiHttp);
const url = 'http://localhost:3000';


describe("Activation OK: ", () => {
    var userCreated = null;
    beforeEach(() => {
        // var userToSend = {
        //     email: Math.random().toString(36).substring(7) + "@localhost.com",
        //     password: Math.random().toString(36).substring(7),
        // }
        // chai.request(url)
        //     .post("/register")
        //     .send(userToSend)
        //     .end(function (err, res) {
        //         userCreated = userToSend;
        //     });
    });
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
    afterEach(() => {
        users.remove(userCreated.access_token, function (err) {})
    });
});
// Activación normal
// Activación sin usuario
// Activación sin ticket