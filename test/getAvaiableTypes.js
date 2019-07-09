const chai = require('chai');
const chaiHttp = require('chai-http');
const expect = require('chai').expect;

chai.use(chaiHttp);
const url = 'http://localhost:3000';

describe("Get Avaiable item types: ", () => {
    before(() => {

    });
    it("Should return a list with Avaiable item types, if logged", (done) => {
        var access_token = "6431c65fe9d6acc0d9d02834b612b3b948fdfe999df47179badec8edd56f4b5d"
        chai.request(url)
            .get("/getAvaiableItemTypes")
            .auth(access_token, "")
            .end(function (err, res) {
                // console.log(res.body)
                expect(res).to.have.status(200);
                done();
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
});