let express = require("express");
let bodyParser = require("body-parser");
let cookieParser = require("cookie-parser");
let router = require("./router");
let config = require("./config");
let https = require("https");
let http = require("http");
let fs = require("fs");

let app = express();
app.set("view engine", "pug");
app.set("views", config.views);
app.use(bodyParser.json());
app.use(cookieParser());
app.use("/", router);
https
  .createServer(
    {
      key: fs.readFileSync("./certs/server.key"),
      cert: fs.readFileSync("./certs/server.cert")
    },
    app
  )
  .listen(config.port.https);

http.createServer(app).listen(config.port.http);
