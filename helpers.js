let config = require("./config");
let graph = require("@microsoft/microsoft-graph-client");
let jwt = require("jsonwebtoken");
let md5 = require("md5");
let _stores = null;
const NOTIFICATION_STORE = "notifs_store";
const COOKIES_STORE = "cookies_store";
const COOKIES_NOTIF = "cookies_subscription_id";

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
let notifUsers = () => getStore(COOKIES_NOTIF);

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
    redirect_uri: config.redirect_uri,
    scope: process.env.APP_SCOPES
  });
  return returnVal;
}

async function getTokenFromCode(auth_code) {
  let result = await oauth2.authorizationCode.getToken({
    code: auth_code,
    redirect_uri: config.redirect_uri,
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
      const maxAge = 3600000;
      let token = await getTokenFromCode(req.query.code);
      // Parse the identity token
      const user = jwt.decode(token.token.id_token);
      // Save the access token in a cookie-store

      let uid = md5(token.token.id_token);
      const client = graph.Client.init({
        authProvider: done => {
          done(null, token.token.access_token);
        }
      });
      let userStore = users();
      if (process.env.NODE_ENV && process.env.NODE_ENV === "production") {
        // subscriptions noop for the local dev
        const subscription = {
          changeType: "created,updated,deleted",
          notificationUrl: config.notif_uri + "/" + uid,
          resource: "me/events",
          expirationDateTime: new Date(Date.now() + 24 * 60 * 60).toISOString(),
          clientState: process.env.NOTIF_CLIENT_SECRET
        };
        const { id: subscription_id } = await client
          .api(`/subscriptions`)
          .post(subscription);
        notifs().set(subscription_id, []);
        notifUsers().set(subscription_id, uid);
      }
      userStore.set(uid, {
        graph_access_token: token.token.access_token,
        graph_user_name: user.name
      });
      res.cookie("uid", uid, { maxAge });
      return res.redirect("/");
    } catch (err) {
      console.log("error", err);
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
  COOKIES_STORE,
  COOKIES_NOTIF
};
