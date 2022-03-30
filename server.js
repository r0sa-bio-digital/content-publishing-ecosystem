console.info('welcome to c0ntent.dao');
// common instances
const knit = require('ordered-uuid-v4');
const express = require('express');
const app = express();
const http = require('http').Server(app);
const pg = require('pg');
const connectionString = process.env.DATABASE_URL;
const port = process.env.PORT || 3000;
const defaultHostingProvider = { id: process.env.HOSTER_ID, name: process.env.HOSTER_NAME }; // TODO: implement proper hosting provider detection
const users = {};
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
async function hostingFeeTransfer(userId, hostingProviderId, amount) {
    const queryString = 'UPDATE "public"."users" SET "balance" = "balance" - ' + amount + ' WHERE "id" = \'' + userId + '\';\n' +
        'UPDATE "public"."hosting_providers" SET "balance" = "balance" + ' + amount + ' WHERE "id" = \'' + hostingProviderId + '\';';
    await runQuery(queryString);
}
async function getContent(contentId) {
    const queryString = 'SELECT * FROM "public"."content" WHERE "id" = \'' + contentId + '\';';
    await runQuery(queryString);
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
        const user = users[userId];
        if (!user)
            return res.status(401).json({ message: 'Invalid Authentication Credentials' });
        req.user = user
        next();
    }
};
// boot the system
console.info('\tserver booting started');

const queryString = 'SELECT * FROM "public"."users" ORDER BY "id" LIMIT 5000 OFFSET 0;';
runQuery(queryString).then( async (result) => {
    // cache users list for auth // TODO: update users list every db update or read it dynamically
    for (let i = 0; i < result.length; ++i)
    {
        const user = result[i];
        users[user.id] = user;
    }
    // define api calls
    app.get('/knit/generate', auth.user, async (req, res) => {
        const apiCallPrice = 1000;
        const resultKnit = knit.generate();
        await hostingFeeTransfer(req.user.id, defaultHostingProvider.id, apiCallPrice);
        res.set('Content-Type', 'text/html');
        res.send(resultKnit);
    });
    app.get('/:knit/extract/timestamp/', auth.user, async (req, res) => {
        const apiCallPrice = 1000;
        const id = req.params.knit.split('=')[1];
        const resultTimestamp = knit.convertTime(id, 'date-object');
        await hostingFeeTransfer(req.user.id, defaultHostingProvider.id, apiCallPrice);
        res.set('Content-Type', 'text/html');
        res.send(resultTimestamp.toISOString());
    });
    app.get('/:knit', auth.user, async (req, res) => {
        const apiCallPrice = {base: 10000, perSymbol: 10};
        const id = req.params.knit.split('=')[1];
        const resultContent = getContent(id);
        console.log(resultContent);
        const apiCallTotalPrice = apiCallPrice.base + apiCallPrice.perSymbol * resultContent.length;
        await hostingFeeTransfer(req.user.id, defaultHostingProvider.id, apiCallPrice);
        res.set('Content-Type', 'text/html');
        res.send(resultContent);
    });
    app.get('/*', auth.public, (req, res) => {
        res.status(404).end();
    });
    http.listen(port, () => console.info(`\tserver is ready and running at port ${port}`));
});