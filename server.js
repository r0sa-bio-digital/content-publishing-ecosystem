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
const apiCallIds = {};
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
async function convertCurrencyToC01n(currencyAmount, currencyId)
{
    const queryString = 'SELECT * FROM "public"."exchange_rates";';
    const rates = await runQuery(queryString);
    let multiplier;
    for (let i = 0; i < rates.length; ++i)
        if (rates[i].currency_id === currencyId)
            multiplier = parseInt(rates[i].c01n_amount);
    const c01nAmount = currencyAmount * multiplier;
    return c01nAmount;
}
async function depositUserFunds(userId, hostingProviderId, fundsAmount, currencyId, apiCallId) {
    const transactionId = knit.generate();
    const amount = await convertCurrencyToC01n(fundsAmount, currencyId);
    const queryString = 'INSERT INTO "public"."transaction_log" ("id", "debited_account", "credited_account", "c01n_amount", "external_amount", "external_currency_id", "content_id", "api_call_id") ' +
        'VALUES (\'' + transactionId + '\', \'' + hostingProviderId + '\', \'' + userId + '\', ' + amount + ', ' + fundsAmount + ', \'' + currencyId + '\', NULL, \'' + apiCallId + '\');\n' +
        'UPDATE "public"."hosting_providers" SET "' + currencyId + '_balance" = "' + currencyId + '_balance" + ' + fundsAmount + ' WHERE "id" = \'' + hostingProviderId + '\';\n' +
        'UPDATE "public"."users" SET "balance" = "balance" + ' + amount + ' WHERE "id" = \'' + userId + '\';';
    await runQuery(queryString);
    return amount;
}
async function withdrawUserFunds(userId, hostingProviderId, fundsAmount, currencyId, apiCallId) {
    const transactionId = knit.generate();
    const amount = await convertCurrencyToC01n(fundsAmount, currencyId);
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
    const queryString = 'SELECT * FROM "public"."exchange_rates";';
    const rates = await runQuery(queryString);
    const currencies = [];
    for (let i = 0; i < rates.length; ++i)
    {
        const id = rates[i].currency_id;
        const queryString = 'SELECT "text" FROM "public"."content" WHERE "id" = \'' + id + '\';';
        const name = (await runQuery(queryString))[0].text;
        currencies.push({id, name, rate: parseInt(rates[i].c01n_amount), rateText: getReadableNumber(rates[i].c01n_amount)});
    }
    return currencies;
}
async function getUserBalance(userId) {
    const queryString = 'SELECT "balance" FROM "public"."users" WHERE "id" = \'' + userId + '\';';
    const balanceResponse = await runQuery(queryString);
    return parseInt(balanceResponse[0].balance);
}
async function getUserTransactions(userId) {
    const queryString = 'SELECT * FROM "public"."transaction_log" WHERE "debited_account" = \'' + userId + '\' OR "credited_account" = \'' + userId + '\';';
    const transactionsResponse = await runQuery(queryString);
    return transactionsResponse;
}
async function getUserName(userId) {
    const queryString = 'SELECT "name" FROM "public"."users" WHERE "id" = \'' + userId + '\';';
    const nameResponse = await runQuery(queryString);
    return nameResponse[0].name;
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
const setApiCallId = (req, res, next) => {
    const apiCallName = req.route.path;
    const apiCallId = apiCallIds[apiCallName];
    if (!knit.validate(apiCallId))
        return res.status(500).json({ message: `Invalid API Call Id for ${apiCallName}` });
    req.apiCallId = apiCallId;
    next();
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
    // cache api call ids list
    const queryString2 = 'SELECT * FROM "public"."api_calls" ORDER BY "id" LIMIT 5000 OFFSET 0;';
    const apiCallsTable = await runQuery(queryString2);
    for (let i = 0; i < apiCallsTable.length; ++i)
    {
        const apiCall = apiCallsTable[i];
        apiCallIds[apiCall.name] = apiCall.id;
    }
    // define api calls
    app.get('/knit/generate', auth.user, setApiCallId, async (req, res) => {
        const apiCallPrice = 1000;
        const resultKnit = knit.generate();
        await hostingFeeTransfer(req.user.id, defaultHostingProvider.id, apiCallPrice, undefined, req.apiCallId);
        res.set('Content-Type', 'text/html');
        res.send(resultKnit);
    });
    app.get('/:knit/extract/timestamp', auth.user, setApiCallId, async (req, res) => {
        const apiCallPrice = 1000;
        const id = req.params.knit;
        const resultTimestamp = knit.convertTime(id, 'date-object');
        await hostingFeeTransfer(req.user.id, defaultHostingProvider.id, apiCallPrice, undefined, req.apiCallId);
        res.set('Content-Type', 'text/html');
        res.send(resultTimestamp.toISOString());
    });
    app.get('/:knit/read/:type', auth.user, setApiCallId, async (req, res) => {
        const apiCallPrice = {base: 10000, perSymbol: 10};
        const id = req.params.knit;
        const contentType = req.params.type;
        const contentRecord = (await getContentRecord(id))[0];
        if (contentRecord)
        {
            const {text, author, author_fee} = contentRecord;
            const apiCallTotalPrice = apiCallPrice.base + apiCallPrice.perSymbol * text.length;
            await hostingFeeTransfer(req.user.id, defaultHostingProvider.id, apiCallTotalPrice, id, req.apiCallId);
            await authorFeeTransfer(req.user.id, author, author_fee, id, req.apiCallId);
            if (contentType === 'jpeg')
            {
                res.set('Content-Type', 'text/html');
                res.send(`<img src="data:image/jpeg;base64,${text}" />`);
            }
            else if (contentType === 'svg')
            {
                res.set('Content-Type', 'image/svg+xml');
                res.send(text);
            }
            else
            {
                res.set('Content-Type', 'text/html');
                res.send(text);
            }
        }
        else
        {
            await hostingFeeTransfer(req.user.id, defaultHostingProvider.id, apiCallPrice.base, undefined, req.apiCallId);
            res.status(404).json({ message: 'Content not found' });
        }
    });
    app.get('/deposit/:user/:amount/:currency', auth.provider, setApiCallId, async (req, res) => {
        const apiCallPrice = 5000;
        const userId = req.params.user;
        const fundsAmount = parseInt(req.params.amount);
        const currencyId = req.params.currency;
        await hostingFeeTransfer(userId, defaultHostingProvider.id, apiCallPrice, undefined, req.apiCallId);
        const c01nsDepositted = await depositUserFunds(
            userId, defaultHostingProvider.id, fundsAmount, currencyId, req.apiCallId);
        res.status(200).json({ c01ns: c01nsDepositted, message: 'depositted successfully' });
    });
    app.get('/withdraw/:user/:amount/:currency', auth.provider, setApiCallId, async (req, res) => {
        const apiCallPrice = 5000;
        const userId = req.params.user;
        const fundsAmount = parseInt(req.params.amount);
        const currencyId = req.params.currency;
        await hostingFeeTransfer(userId, defaultHostingProvider.id, apiCallPrice, undefined, req.apiCallId);
        const c01nsWithdrew = await withdrawUserFunds(
            userId, defaultHostingProvider.id, fundsAmount, currencyId, req.apiCallId);
        res.status(200).json({ c01ns: c01nsWithdrew, message: 'withdrew successfully' });
    });
    app.get('/currency/exchange/rates', auth.user, setApiCallId, async (req, res) => {
        const apiCallPrice = 25000;
        await hostingFeeTransfer(req.user.id, defaultHostingProvider.id, apiCallPrice, undefined, req.apiCallId);
        const rates = await getExchangeRates();
        res.status(200).json(rates);
    });
    app.get('/user/balance', auth.user, setApiCallId, async (req, res) => {
        const apiCallPrice = 2000;
        await hostingFeeTransfer(req.user.id, defaultHostingProvider.id, apiCallPrice, undefined, req.apiCallId);
        const userBalance = await getUserBalance(req.user.id);
        res.status(200).json({currency: 'c01n', amount: userBalance, amountText: getReadableNumber(userBalance)});
    });
    app.get('/user/transactions/history', auth.user, setApiCallId, async (req, res) => {
        const apiCallPrice = 10000;
        await hostingFeeTransfer(req.user.id, defaultHostingProvider.id, apiCallPrice, undefined, req.apiCallId);
        const userTransactions = await getUserTransactions(req.user.id);
        res.status(200).json(userTransactions);
    });
    app.get('/user/login', auth.user, setApiCallId, async (req, res) => {
        const apiCallPrice = 2000;
        await hostingFeeTransfer(req.user.id, defaultHostingProvider.id, apiCallPrice, undefined, req.apiCallId);
        const userName = await getUserName(req.user.id);
        res.status(200).json({id: req.user.id, name: userName});
    });
    app.get('/', auth.public, (req, res) => {
        res.sendFile(__dirname + '/index.html');
    });
    app.get('/index.html', auth.public, (req, res) => {
        res.sendFile(__dirname + '/index.html');
    });
    app.get('/favicon.ico', auth.public, (req, res) => {
        res.sendFile(__dirname + '/favicon.ico');
    });
    app.get('/*', auth.public, (req, res) => {
        res.status(404).end();
    });
    http.listen(port, () => console.info(`\tserver is ready and running at port ${port}`));
});