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
async function hostingFeeTransfer(userId, hostingProviderId, amount, contentId, apiCallId) {
    const transactionId = knit.generate();
    const contentIdValue = contentId ? '\'' + contentId + '\'' : 'NULL';
    const queryString = 'INSERT INTO "public"."transaction_log" ("id", "debited_account", "credited_account", "c01n_amount", "content_id", "api_call_id") ' +
        'VALUES (\'' + transactionId + '\', \'' + userId + '\', \'' + hostingProviderId + '\', ' + amount + ', ' + contentIdValue + ', \'' + apiCallId + '\');\n' +
        'UPDATE "public"."users" SET "balance" = "balance" - ' + amount + ' WHERE "id" = \'' + userId + '\';\n' +
        'UPDATE "public"."hosting_providers" SET "balance" = "balance" + ' + amount + ' WHERE "id" = \'' + hostingProviderId + '\';';
    await runQuery(queryString);
}
async function authorFeeTransfer(userId, authorId, amount) {
    const queryString = 'UPDATE "public"."users" SET "balance" = "balance" - ' + amount + ' WHERE "id" = \'' + userId + '\';\n' +
        'UPDATE "public"."users" SET "balance" = "balance" + ' + amount + ' WHERE "id" = \'' + authorId + '\';';
    await runQuery(queryString);
}
async function getContentRecord(contentId) {
    const queryString = 'SELECT * FROM "public"."content" WHERE "id" = \'' + contentId + '\';';
    return await runQuery(queryString);
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
        const apiCallId = '95f37a03-c1c7-41fe-bead-33c4536b0a2b';
        const apiCallPrice = 1000;
        const resultKnit = knit.generate();
        await hostingFeeTransfer(req.user.id, defaultHostingProvider.id, apiCallPrice, undefined, apiCallId);
        res.set('Content-Type', 'text/html');
        res.send(resultKnit);
    });
    app.get('/:knit/extract/timestamp/', auth.user, async (req, res) => {
        const apiCallId = '95f37a28-aa0e-4a73-a833-7a707144f5ce';
        const apiCallPrice = 1000;
        const id = req.params.knit.split('=')[1];
        const resultTimestamp = knit.convertTime(id, 'date-object');
        await hostingFeeTransfer(req.user.id, defaultHostingProvider.id, apiCallPrice, undefined, apiCallId);
        res.set('Content-Type', 'text/html');
        res.send(resultTimestamp.toISOString());
    });
    app.get('/:knit', auth.user, async (req, res) => {
        const apiCallId = '95f37a3f-19ad-448e-bd56-04a8da5c0df4';
        const apiCallPrice = {base: 10000, perSymbol: 10};
        const id = req.params.knit.split('=')[1];
        const contentRecord = (await getContentRecord(id))[0];
        if (contentRecord)
        {
            const {text, author, author_fee} = contentRecord;
            const apiCallTotalPrice = apiCallPrice.base + apiCallPrice.perSymbol * text.length;
            await hostingFeeTransfer(req.user.id, defaultHostingProvider.id, apiCallTotalPrice, id, apiCallId);
            await authorFeeTransfer(req.user.id, author, author_fee);
            res.set('Content-Type', 'text/html');
            res.send(text);
        }
        else
        {
            await hostingFeeTransfer(req.user.id, defaultHostingProvider.id, apiCallPrice.base, undefined, apiCallId);
            res.status(404).json({ message: 'Content not found' });
        }
    });
    app.get('/*', auth.public, (req, res) => {
        res.status(404).end();
    });
    http.listen(port, () => console.info(`\tserver is ready and running at port ${port}`));
});