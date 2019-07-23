require("dotenv").config();
let jwt = require("jsonwebtoken");
let md5 = require("md5");
let _stores = null;
const NOTIFICATION_STORE = "notifs_store";
const COOKIES_STORE = "cookies_store";

function getStore(name) {
  if (!_stores) {
    _stores = new Map();
  }
  if (!_stores.has(name)) {
    _stores.set(name, new Map());
  }
  return _stores.get(name);
}

let notifs = () => getStore(NOTIFICATION_STORE);
let users = () => getStore(COOKIES_STORE);

let getUser = id => users().get(id, null);

const credentials = {
  client: {
    id: process.env.APP_ID,
    secret: process.env.APP_PASSWORD
  },
  auth: {
    tokenHost: "https://login.microsoftonline.com",
    authorizePath: "common/oauth2/v2.0/authorize",
    tokenPath: "common/oauth2/v2.0/token"
  }
};

const oauth2 = require("simple-oauth2").create(credentials);

function createSignInLink() {
  const returnVal = oauth2.authorizationCode.authorizeURL({
    redirect_uri: process.env.REDIRECT_URI,
    scope: process.env.APP_SCOPES
  });
  return returnVal;
}

async function getTokenFromCode(auth_code) {
  let result = await oauth2.authorizationCode.getToken({
    code: auth_code,
    redirect_uri: process.env.REDIRECT_URI,
    scope: process.env.APP_SCOPES
  });
  const token = oauth2.accessToken.create(result);
  return token;
}

const permissioned = (
  redirectTo = "/",
  checker = (req, cookie_store) => {
    return (
      req.cookies &&
      req.cookies.uid &&
      cookie_store.get(req.cookies.uid) &&
      cookie_store.get(req.cookies.uid)["graph_access_token"]
    );
  }
) => (req, res, next) => {
  if (checker(req, getStore("cookies_store"))) {
    next();
  } else {
    return res.redirect(403, redirectTo);
  }
};

const login = async (req, res) => {
  if (req.cookies && req.cookies.uid) {
    let user = getUser(req.cookies.uid);
    if (!user || !user.graph_access_token) {
      res.clearCookie("uid");
    }
    return res.redirect("/");
  } else if (req.query.code) {
    try {
      let token = await getTokenFromCode(req.query.code);
      // Parse the identity token
      const user = jwt.decode(token.token.id_token);
      // Save the access token in a cookie-store
      let uid = md5(token.token.id_token);
      let userStore = users();
      userStore.set(uid, {
        graph_access_token: token.token.access_token,
        graph_user_name: user.name
      });
      res.cookie("uid", uid, { maxAge: 3600000 });
      return res.redirect("/");
    } catch (err) {
      return res.render("index", { ...err, content_key: "error" });
    }
  } else {
    // redirect to login from microsoft
    return res.redirect(createSignInLink());
  }
};

module.exports = {
  createSignInLink,
  permissioned,
  login,
  getStore,
  notifs,
  users,
  getUser,
  NOTIFICATION_STORE,
  COOKIES_STORE
};
