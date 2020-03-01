const express = require('express');
const os = require("os");
const expressWebSocket = require('express-ws');
const websocketStream = require('websocket-stream/stream');
const app = express()
const bodyParser = require('body-parser');
const formData = require("express-form-data");
const session = require('express-session');
const cors = require('cors');
const ssh = require('./services/ssh');
const PORT = 3000;

app.use(function injectCookieFromQuery(req, res, next) {
    // hack for websocket session management
    if (req.query.cookie) {
        try {
            req.headers['cookie'] = req.query.cookie;
        } catch (err) {
            console.log(err);
        }
    }
    return next();
});

app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true,
    cookie: {
        httpOnly: false
    }
}));

// body parser
app.use(bodyParser.json());
app.use(formData.parse({
    uploadDir: os.tmpdir(),
    autoClean: true
}));
// delete from the request all empty files (size == 0)
app.use(formData.format());
// change the file objects to fs.ReadStream 
app.use(formData.stream());

app.use(cors({
    origin: ["http://localhost:8080"],
    credentials: true
}));

// extend express app with app.ws()
expressWebSocket(app, null, {
    // ws options here
    perMessageDeflate: false,
});

function isAuthenticated(req, res, next) {
    // hack for the websocket library way of calling middlewares ( middleware(req.ws, req, next) )
    if (res.session) req.session = res.session;

    if (req.session && req.session.loggedin) {
        return next();
    } else {
        return res.status(403).json({
            message: "no session found"
        })
    }
}

app.get('/', function (req, res) {
    res.send('SSH Terminal')
})

app.post('/login', function (req, res) {
    if (req.files && req.files.key) {
        let sshKey = "";
        req.files.key.on('data', (chunk) => {
            sshKey += chunk
        });
        req.files.key.on('end', () => {
            req.session.ssh = {
                host: req.body.host,
                user: req.body.user,
                password: req.body.password,
                key: sshKey
            }
            req.session.loggedin = true;
            return res.status(200).json({
                loggedin: true
            });
        });
    } else if (req.body.password) {
        req.session.ssh = {
            host: req.body.host,
            user: req.body.user,
            password: req.body.password
        }
        req.session.loggedin = true;
        return res.status(200).json({
            loggedin: true
        });
    } else {
        return res.status(403).json({
            message: 'key file or password must be provided'
        })
    }
});

app.ws('/ssh', isAuthenticated, async function (ws, req) {
    // convert ws instance to stream
    const stream = websocketStream(ws, {
        // websocket-stream options here
        binary: false,
    });

    try {
        await ssh.openShell(req.session.ssh.host, req.session.ssh.user, req.session.ssh.password, req.session.ssh.key, stream);
    } catch (error) {
        console.log('error catched : ');
        console.log(error);
        ws.close();
    }
});

app.listen(PORT, function () {
    console.log(`Server started on port  3000 :)`);
});