let express = require("express");
let bodyParser = require("body-parser");
let cookieParser = require("cookie-parser");
let router = require("./router");
let config = require("./config");

let app = express();
app.set("view engine", "pug");
app.set("views", config.views);
app.use(bodyParser.json());
app.use(cookieParser());
app.use("/", router);

app.listen(config.port);
