const chai = require('chai');
const chaiHttp = require('chai-http');
const expect = chai.expect; // Asegúrate de importar la función expect
chai.use(chaiHttp);
let app = 'http://localhost:8084'

describe("Pruebas servidor", () => {
    it("GET status 200", (done) => { // Agrega done
        chai.request(app)
            .get('/alumnos')
            .end((err, res) => {
                expect(err).to.be.null;
                expect(res).to.have.status(200);
                done(); // Llama a done para indicar que la prueba ha finalizado
            });
    });
});
