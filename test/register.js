const chai = require('chai');
const chaiHttp = require('chai-http');
const expect = require('chai').expect;

const users = require("../lib/main/admin/users.js");

chai.use(chaiHttp);
const url = 'http://localhost:3000';

var users = [];

describe("Register OK: ", () => {
    it("Should insert a user with nick", (done) => {
        var userToSend = {
            nick: "prueba",
            email: Math.random().toString(36).substring(7) + "@localhost.com",
            password: Math.random().toString(36).substring(7),
        }
        chai.request(url)
            .post("/register")
            .send(userToSend)
            .end(function (err, res) {
                // console.log(res.body)
                var user = res.body.user;
                users.push(user.access_token);

                expect(res).to.have.status(200);
                expect(user.nick).to.be.equal(userToSend.nick);
                expect(user.email).to.be.equal(userToSend.email);
                expect(user.access_token).to.be.equal(users.getToken(userToSend.email, userToSend.password));
                done();
            });
    });
    it("Should insert a user without nick", (done) => {
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
                users.push(user.access_token);

                expect(res).to.have.status(200);
                expect(user.nick).to.be.equal(userToSend.email.split("@")[0]);
                expect(user.email).to.be.equal(userToSend.email);
                expect(user.access_token).to.be.equal(users.getToken(userToSend.email, userToSend.password));
                done();
            });
    });
    // Quitar usuarios introducidos
    // after(() => {
    //     chai.request(url)
    //         .del("/users/" + users.join(","))
    //         .end(function () {
    //             done();
    //         });
    // });
});
describe("Register With Errors: ", () => {
    it("Should fail if you insert a user that already exists", (done) => {
        var userToSend = {
            email: Math.random().toString(36).substring(7) + "@localhost.com",
            password: Math.random().toString(36).substring(7),
        }

        chai.request(url)
            .post("/register")
            .send(userToSend)
            .end(function (err, res) {
                expect(res).to.have.status(200);
                chai.request(url)
                    .post("/register")
                    .send(userToSend)
                    .end(function (err, res) {
                        // console.log(res.body)
                        expect(res).to.have.status(400);
                        done();
                    });
            });
    });
    it("Should fail if you insert a user without email", (done) => {
        var userToSend = {
            password: Math.random().toString(36).substring(7),
        }

        chai.request(url)
            .post("/register")
            .send(userToSend)
            .end(function (err, res) {
                // console.log(res.body)
                expect(res).to.have.status(400);
                done();
            });
    });
    it("Should fail if you insert a user without password", (done) => {
        var userToSend = {
            email: Math.random().toString(36).substring(7) + "@localhost.com",
        }

        chai.request(url)
            .post("/register")
            .send(userToSend)
            .end(function (err, res) {
                // console.log(res.body)
                expect(res).to.have.status(400);
                done();
            });
    });
});