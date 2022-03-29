console.info('welcome to c0ntent.dao');
// common instances
const knit = require('ordered-uuid-v4');
const express = require('express');
const app = express();
const cors = require('cors');
const http = require('http').Server(app);
const pg = require('pg');
const port = process.env.PORT || 3000;
app.use(express.json({limit: '10mb'}));
// common functions
async function runQuery(queryString) {
    const client = new pg.Client({
        connectionString,
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    });
    try {
        await client.connect();
    } catch(e) {
        console.warn(e);
        return {error: e, step: 'client connect'};
    }
    let result = {};
    try {
        result = (await client.query(queryString)).rows;
    } catch (e) {
        console.warn(e);
        result = {error: e, step: 'client query'};
    }
    try {
        await client.end();
    } catch(e) {
        console.warn(e);
        return {error: e, step: 'client end'};
    }
    return result;
}
const auth = {
    public: (req, res, next) => next(),
    user: (req, res, next) => {
        if (!req.headers.authorization || req.headers.authorization.indexOf('Basic ') === -1) {
            return res.status(401).json({ message: 'Missing Authorization Header' });
        }
        const base64Credentials =  req.headers.authorization.split(' ')[1];
        const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
        const userId = credentials.split(':')[0];
        console.log('auth: ' + userId); // TODO: check if userId inside of users table, charge user for operation
        /*
        const user = ???;
        if (!user)
            return res.status(401).json({ message: 'Invalid Authentication Credentials' });
        req.user = user
        */
        next();
    }
};
// boot the system
console.info('\tserver booting started');

const queryString = 'SELECT * FROM "public"."users" ORDER BY "id" LIMIT 5000 OFFSET 0;';
runQuery(queryString).then( async (result) => {
    console.log(result);
    // TODO: cache users list for auth
    app.get('/knit/generate', auth.user, (req, res) => {
        res.set('Content-Type', 'text/html');
        res.send(knit.generate());
    });
    app.get('/*', auth.public, (req, res) => {
        res.status(404).end();
    });
    http.listen(port, () => console.info(`\tserver is ready and running at port ${port}`));
});