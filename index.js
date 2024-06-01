const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const swaggerUI = require('swagger-ui-express')
const swaggerJsDoc = require('swagger-jsdoc')
const { SwaggerTheme } = require('swagger-themes');
const redoc = require('redoc-express');
const port = process.env.PORT || 8084
const host = process.env.host || 'localhost'
const user = process.env.user || 'root'
const password = process.env.password || '2701'
const database = process.env.database || 'nintendo'
const dbport = process.env.dbport || 3306
const secretKey = 'mi_clave_secreta_para_los_tokens_jwt';


const dataDeBase = {
    host: host,
    user: user,
    password: password,
    database: database,
    port:dbport
};

const app = express();

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
  });

const theme = new SwaggerTheme('v3');

const options = {
  explorer: true,
  customCss: theme.getBuffer('outline')
};

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204,
  }));
  

const def = fs.readFileSync(path.join(__dirname,'./swagger.json'),
    {encoding:'utf8',flags:'r'});

const read = fs.readFileSync(path.join(__dirname,'./README.md'),
    {encoding:'utf8',flags:'r'});

const defObj = JSON.parse(def);
defObj.info.description = read;

const swaggerOptions = {
    definition:defObj,
    apis: [`${path.join(__dirname, "./index.js")}`]
}

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use("/api-docs",swaggerUI.serve,swaggerUI.setup(swaggerDocs,options));

app.use("/api-docs-json",(req,res)=>{
    res.json(swaggerDocs);
});

const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' });

app.use(morgan('combined', { stream: accessLogStream }));

app.get('/', function (req, res) {
    res.send('hello, world!');
});

//ALL USERS
/**
 * @swagger
 * /juegos/:
 *   get:
 *     tags:
 *       - juegos
 *     summary: Consultar todos los juegos
 *     description: Obtiene Json que con todos los juegos de la Base de Datos
 *     responses:
 *       200:
 *         description: Regresa un Json con todos los juegos
 */
app.get('/juegos', async (req, resp) => {
    try {
        const conexion = await mysql.createConnection(dataDeBase);
        const [rows, fields] = await conexion.query('SELECT * FROM juegos');
        resp.json(rows);
    } catch (err) {
        resp.status(500).json({ mensaje: 'Error de conexión', tipo: err.message, sql: err.sqlMessage });
    }
});

// SELECT
/**
 * @swagger
 * /juegos/{id}:
 *   get:
 *     tags:
 *       - juegos
 *     summary: Consultar un juego por ID
 *     description: Obtiene Json con un juego específico de la Base de Datos
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID del juego a consultar
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Regresa un Json con el juego solicitado
 *       404:
 *         description: El juego no existe
 */
app.get('/juegos/:id', verificarToken, async (req, resp) => {
    try {
        const conexion = await mysql.createConnection(dataDeBase);
        const [rows, fields] = await conexion.query('SELECT * FROM juegos WHERE id = ?', [req.params.id]); // Usa parámetros para evitar inyección SQL

        if (rows.length == 0) {
            resp.status(404).json({ mensaje: 'Juego no encontrado' });
        } else {
            resp.json(rows[0]); // Envía solo el primer juego encontrado
        }
    } catch (err) {
        resp.status(500).json({ mensaje: 'Error de conexión', tipo: err.message, sql: err.sqlMessage });
    }
});


// INSERT INTO
/**
 * @swagger
 * /juegos/:
 *   post:
 *     tags:
 *       - juegos
 *     summary: Agregar un nuevo juego
 *     description: Agrega un nuevo juego a la Base de Datos con los parámetros proporcionados en el cuerpo de la solicitud
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *               precio:
 *                 type: string
 *             required:
 *               - nombre
 *               - precio
 *     responses:
 *       201:
 *         description: Usuario agregado correctamente
 */
app.post('/juegos', async (req, resp) => {
    try {
        const nom = req.body.nombre;
        const pre = req.body.precio;
        const conexion = await mysql.createConnection(dataDeBase);
        const [result] = await conexion.query('INSERT INTO juegos (nombre, precio) VALUES (?, ?)', [nom, pre]);
        
        resp.status(201).json({ mensaje: 'Usuario agregado correctamente'});
    } catch (err) {
        resp.status(500).json({ mensaje: 'Error de conexión', tipo: err.message, sql: err.sqlMessage });
    }
});  

// UPDATE
/**
 * @swagger
 * /juegos/:
 *   put:
 *     tags:
 *       - juegos
 *     summary: Modificar un juego existente
 *     description: Modifica un juego existente en la Base de Datos con los parámetros proporcionados en el cuerpo de la solicitud
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *               nombre:
 *                 type: string
 *               precio:
 *                 type: string
 *             required:
 *               - id
 *     responses:
 *       200:
 *         description: Usuario modificado correctamente
 *       404:
 *         description: Usuario no encontrado
 *       400:
 *         description: Solicitud incorrecta
 */
app.put('/juegos', async (req, res) => {
    try {
        const objeto = req.body;
        const conexion = await mysql.createConnection(dataDeBase);

        if (!objeto.id || Object.keys(objeto).length === 1) {
            return res.status(400).json({ error: 'Solicitud incorrecta' });
        }
    
        let sentenciaSql = `UPDATE juegos SET `;
        const campos = Object.keys(objeto).filter(key => key !== 'id');
        
        for (let i = 0; i < campos.length; i++) {
            if (i == campos.length - 1) {
                sentenciaSql += `${campos[i]} = '${objeto[campos[i]]}'`;
            } else {
                sentenciaSql += `${campos[i]} = '${objeto[campos[i]]}', `;
            }
        }
        sentenciaSql += ` WHERE id = ${objeto.id};`;
        const result = await conexion.query(sentenciaSql);

        if (result.affectedRows == 0) {
            res.status(404).json({ mensaje: 'Usuario no encontrado' });
        } else {
            res.json({ mensaje: 'Usuario modificado correctamente' });
        }
    } catch (err) {
        res.status(500).json({ mensaje: 'Error de conexión', tipo: err.message, sql: err.sqlMessage });
    }
});

// DELETE
/**
 * @swagger
 * /juegos/:
 *   delete:
 *     tags:
 *       - juegos
 *     summary: Eliminar un juego por ID
 *     description: Elimina un juego de la Base de Datos según el ID proporcionado en los parámetros de la solicitud
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         description: ID del juego a eliminar
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Registro eliminado correctamente
 *       404:
 *         description: Registro no encontrado
 */
app.delete('/juegos', async (req, resp) => {
    try {
        const id = req.query.id;
        console.log(id);
        const conexion = await mysql.createConnection(dataDeBase);
        const query = "DELETE FROM juegos WHERE id = "+id;
        const [rows, fields] = await conexion.query(query);
        if (rows.affectedRows == 0) {
            resp.json({ mensaje: 'Registro No Eliminado' });
        } else {
            resp.json({ mensaje: 'Registro Eliminado' });
        }
    } catch (err) {
        resp.status(500).json({ mensaje: 'Error de conexión', tipo: err.message, sql: err.sqlMessage });
    }
});

//URLSearch
app.post('/juegos/urlencoded', async (req, resp) => {
    try {
        const id = req.body.id;
        const nom = req.body.nombre;
        const ape = req.body.apellido;
        const conexion = await mysql.createConnection(dataDeBase);
        const [result] = await conexion.query('INSERT INTO tec (id, nombre, apellido) VALUES (?, ?, ?)', [id, nom, ape]);

        resp.status(201).json({ mensaje: 'Usuario agregado correctamente' });
    } catch (err) {
        resp.status(500).json({ mensaje: 'Error de conexión', tipo: err.message, sql: err.sqlMessage });
        console.error(err);
    }
});

//Data
const multer = require('multer');
const upload = multer();
app.post('/juegos/multipart', upload.none(), async (req, resp) => {
    try {
        const id = req.body.id;
        const nom = req.body.nombre;
        const ape = req.body.apellido;
        const conexion = await mysql.createConnection(dataDeBase);
        const [result] = await conexion.query('INSERT INTO tec (id, nombre, apellido) VALUES (?, ?, ?)', [id, nom, ape]);

        resp.status(201).json({ mensaje: 'Usuario agregado correctamente' });
    } catch (err) {
        resp.status(500).json({ mensaje: 'Error de conexión', tipo: err.message, sql: err.sqlMessage });
        console.error(err);
    }
});

app.get(
    '/api-docs-redoc',
    redoc({
      title: 'API Docs',
      specUrl: '/api-docs-json',
      nonce: '', // <= it is optional,we can omit this key and value
      // we are now start supporting the redocOptions object
      // you can omit the options object if you don't need it
      // https://redocly.com/docs/api-reference-docs/configuration/functionality/
      redocOptions: {
        theme: {
          colors: {
            primary: {
              main: '#6EC5AB'
            }
          },
          typography: {
            fontFamily: `"museo-sans", 'Helvetica Neue', Helvetica, Arial, sans-serif`,
            fontSize: '15px',
            lineHeight: '1.5',
            code: {
              code: '#87E8C7',
              backgroundColor: '#4D4D4E'
            }
          },
          menu: {
            backgroundColor: '#ffffff'
          }
        }
      }
    })
  );

  app.post('/login', (req, res) => {
    const { username, password } = req.body; //Extraigo el usuario y password del cuerpo
    // Verifica las credenciales del usuario 
    if (username === 'a' && password === 'a') {
        // Genera un token con información del usuario
        const token = jwt.sign({ username: username }, secretKey, { expiresIn: '1h' });
        res.json({ token: token });  //Devuelvo el token firmado
    } else {
        res.status(401).json({ mensaje: 'Credenciales inválidas' });
    }
});

function verificarToken(req, resp, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return resp.status(401).json({ mensaje: 'Acceso no autorizado' });
    }

    const token = authHeader.split(' ')[1]; // Eliminar "Bearer " del token

    if (!token) {
        return resp.status(401).json({ mensaje: 'Acceso no autorizado' });
    }

    try {
        const decoded = jwt.verify(token, secretKey);
        req.usuario = decoded;
        next();
    } catch (error) {
        return resp.status(403).json({ mensaje: 'Token inválido' });
    }
}


app.listen(port, () => {
    console.log('Servidor express escuchando en puerto: ',port);
});