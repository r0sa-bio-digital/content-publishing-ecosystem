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
async function authorFeeTransfer(userId, authorId, amount, contentId, apiCallId) {
    const transactionId = knit.generate();
    const queryString = 'INSERT INTO "public"."transaction_log" ("id", "debited_account", "credited_account", "c01n_amount", "content_id", "api_call_id") ' +
        'VALUES (\'' + transactionId + '\', \'' + userId + '\', \'' + authorId + '\', ' + amount + ', \'' + contentId + '\', \'' + apiCallId + '\');\n' +
        'UPDATE "public"."users" SET "balance" = "balance" - ' + amount + ' WHERE "id" = \'' + userId + '\';\n' +
        'UPDATE "public"."users" SET "balance" = "balance" + ' + amount + ' WHERE "id" = \'' + authorId + '\';';
    await runQuery(queryString);
}
function convertCurrencyToC01n(currencyAmount, currencyId)
{
    const c01nAmount = currencyAmount * 1000; // TODO: implement correct currency convertion
    return c01nAmount;
}
async function depositUserFunds(userId, hostingProviderId, fundsAmount, currencyId, apiCallId) {
    const transactionId = knit.generate();
    const amount = convertCurrencyToC01n(fundsAmount, currencyId);
    const queryString = 'INSERT INTO "public"."transaction_log" ("id", "debited_account", "credited_account", "c01n_amount", "external_amount", "external_currency_id", "content_id", "api_call_id") ' +
        'VALUES (\'' + transactionId + '\', \'' + hostingProviderId + '\', \'' + userId + '\', ' + amount + ', ' + fundsAmount + ', \'' + currencyId + '\', NULL, \'' + apiCallId + '\');\n' +
        'UPDATE "public"."hosting_providers" SET "' + currencyId + '_balance" = "' + currencyId + '_balance" + ' + fundsAmount + ' WHERE "id" = \'' + hostingProviderId + '\';\n' +
        'UPDATE "public"."users" SET "balance" = "balance" + ' + amount + ' WHERE "id" = \'' + userId + '\';';
    await runQuery(queryString);
    return amount;
}
async function withdrawUserFunds(userId, hostingProviderId, fundsAmount, currencyId, apiCallId) {
    const transactionId = knit.generate();
    const amount = convertCurrencyToC01n(fundsAmount, currencyId);
    const queryString = 'INSERT INTO "public"."transaction_log" ("id", "debited_account", "credited_account", "c01n_amount", "external_amount", "external_currency_id", "content_id", "api_call_id") ' +
        'VALUES (\'' + transactionId + '\', \'' + userId + '\', \'' + hostingProviderId + '\', ' + amount + ', ' + fundsAmount + ', \'' + currencyId + '\', NULL, \'' + apiCallId + '\');\n' +
        'UPDATE "public"."hosting_providers" SET "' + currencyId + '_balance" = "' + currencyId + '_balance" - ' + fundsAmount + ' WHERE "id" = \'' + hostingProviderId + '\';\n' +
        'UPDATE "public"."users" SET "balance" = "balance" - ' + amount + ' WHERE "id" = \'' + userId + '\';';
    await runQuery(queryString);
    return amount;
}
async function getContentRecord(contentId) {
    const queryString = 'SELECT * FROM "public"."content" WHERE "id" = \'' + contentId + '\';';
    return await runQuery(queryString);
}
function getReadableNumber(numberText) {
    return numberText.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
async function getExchangeRates() {
    const result = [];
    const queryString = 'SELECT * FROM "public"."exchange_rates";';
    const rates = await runQuery(queryString);
    console.log(rates);
    const currencies = [];
    for (let i = 0; i < rates.length; ++i)
        currencies.push({id: rates[i].currency_id, name: '?', rate: parseInt(rates[i].c01n_amount), rateText: getReadableNumber(rates[i].c01n_amount)});
    return currencies;
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
    },
    provider: (req, res, next) => {
        if (!req.headers.authorization || req.headers.authorization.indexOf('Basic ') === -1) {
            return res.status(401).json({ message: 'Missing Authorization Header' });
        }
        const base64Credentials =  req.headers.authorization.split(' ')[1];
        const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
        const providerId = credentials.split(':')[0];
        if (providerId !== defaultHostingProvider.id)
            return res.status(401).json({ message: 'Invalid Authentication Credentials' });
        req.provider = defaultHostingProvider;
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
            await authorFeeTransfer(req.user.id, author, author_fee, id, apiCallId);
            res.set('Content-Type', 'text/html');
            res.send(text);
        }
        else
        {
            await hostingFeeTransfer(req.user.id, defaultHostingProvider.id, apiCallPrice.base, undefined, apiCallId);
            res.status(404).json({ message: 'Content not found' });
        }
    });
    app.get('/deposit/:user/:amount/:currency', auth.provider, async (req, res) => {
        const apiCallId = '95f40824-f51c-4a3c-85b4-c15d53b91df5';
        const apiCallPrice = 5000;
        const userId = req.params.user.split('=')[1];
        const fundsAmount = parseInt(req.params.amount.split('=')[1]);
        const currencyId = req.params.currency.split('=')[1];
        await hostingFeeTransfer(userId, defaultHostingProvider.id, apiCallPrice, undefined, apiCallId);
        const c01nsDepositted = await depositUserFunds(
            userId, defaultHostingProvider.id, fundsAmount, currencyId, apiCallId);
        res.status(200).json({ c01ns: c01nsDepositted, message: 'depositted successfully' });
    });
    app.get('/withdraw/:user/:amount/:currency', auth.provider, async (req, res) => {
        const apiCallId = '95f40876-76a1-4399-90b9-143c3b9d5c52';
        const apiCallPrice = 5000;
        const userId = req.params.user.split('=')[1];
        const fundsAmount = parseInt(req.params.amount.split('=')[1]);
        const currencyId = req.params.currency.split('=')[1];
        await hostingFeeTransfer(userId, defaultHostingProvider.id, apiCallPrice, undefined, apiCallId);
        const c01nsWithdrew = await withdrawUserFunds(
            userId, defaultHostingProvider.id, fundsAmount, currencyId, apiCallId);
        res.status(200).json({ c01ns: c01nsWithdrew, message: 'withdrew successfully' });
    });
    app.get('/currency/exchange/rates', auth.user, async (req, res) => {
        const apiCallId = '95f7d8c2-4dbb-4d10-b394-3143a2307866';
        const apiCallPrice = 7500;
        await hostingFeeTransfer(req.user.id, defaultHostingProvider.id, apiCallPrice, undefined, apiCallId);
        const rates = await getExchangeRates();
        res.status(200).json(rates);
    });
    app.get('/*', auth.public, (req, res) => {
        res.status(404).end();
    });
    http.listen(port, () => console.info(`\tserver is ready and running at port ${port}`));
});