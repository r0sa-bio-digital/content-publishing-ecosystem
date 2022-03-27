console.info('welcome to c0ntent.dao');
// common instances
const knit = require('uuid');
const express = require('express');
const app = express();
const cors = require('cors');
const http = require('http').Server(app);
const port = process.env.PORT || 3000;
app.use(express.json({limit: '10mb'}));
// boot the system
console.info('\tserver booting started');
const auth = {
    public: (req, res, next) => next()
};
app.get('/knit/new', auth.public, (req, res) => {
    res.set('Content-Type', 'text/html');
    res.send(knit.generate());
});
http.listen(port, () => console.info(`\tserver is ready and running at port ${port}`));