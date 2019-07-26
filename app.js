require("dotenv").config();
let express = require("express");
let bodyParser = require("body-parser");
let cookieParser = require("cookie-parser");
let router = require("./router");
let config = require("./config");
let http = require("http");
let app = express();
app.set("view engine", "pug");
app.set("views", config.views);
app.use(bodyParser.json());
app.use(cookieParser());
app.use("/", router);
if (process.env._SECURE_HTTP && process.env.NODE_ENV !== "production") {
  // for production a https proxy is(/should be) in place so no need
  let fs = require("fs");
  let https = require("https");
  https
    .createServer(
      {
        key: fs.readFileSync("./certs/server.key"),
        cert: fs.readFileSync("./certs/server.cert")
      },
      app
    )
    .listen(config.port.https);
} else {
  http.createServer(app).listen(config.port.http);
}
