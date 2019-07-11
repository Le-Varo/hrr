const chai = require('chai');
const chaiHttp = require('chai-http');
const expect = require('chai').expect;

const users = require("../lib/main/admin/users.js");

chai.use(chaiHttp);
const url = process.env.HEROKU_URL || 'http://localhost:3000';

describe("Get Avaiable item types: ", () => {
    var userCreated;
    it("Should return a list with Avaiable item types, if logged", (done) => {
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
                userCreated = user.access_token;
                users.activateByAccessToken(userCreated, function () {
                    chai.request(url)
                        .get("/getAvaiableItemTypes")
                        .auth(userCreated, "")
                        .end(function (err, res) {
                            // console.log(res.body)
                            expect(res).to.have.status(200);
                            done();
                        });
                });
            });
    });
    it("Should return an error, if not logged", (done) => {
        chai.request(url)
            .get("/getAvaiableItemTypes")
            .end(function (err, res) {
                // console.log(res.body)
                expect(res).to.have.status(401);
                done();
            });
    });
    after(() => {
        users.remove(userCreated, function (err, res) {})
    });
});