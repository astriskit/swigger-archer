let config = require("./config");
let graph = require("@microsoft/microsoft-graph-client");
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

let logout = async (req, res) => {
  try {
    const { graph_access_token, subscription_id = undefined } = getUser(
      req.cookies.uid
    );
    if (subscription_id) {
      const client = graph.Client.init({
        authProvider: done => {
          done(null, graph_access_token);
        }
      });
      await client.api("/subscriptions/" + subscription_id).delete();
      notifs().delete(subscription_id);
    }
    users().delete(req.cookies.uid);
    res.clearCookie("uid");
    return res.redirect("/");
  } catch (err) {
    return res.render("error", { ...err, content_key: "error" });
  }
};

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
  if (checker(req, getStore(COOKIES_STORE))) {
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
      let sub_id = undefined;
      if (process.env.NODE_ENV && process.env.NODE_ENV === "production") {
        // subscriptions noop for the local dev
        //clear other subscriptions, if any
        const priorSubscriptions = await client.api("/subscriptions").get();
        if (priorSubscriptions.length) {
          await Promise.all(
            priorSubscriptions.map(({ id }) => {
              return client.api(`/subscriptions/${id}`).delete();
            })
          );
        }
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
        sub_id = subscription_id;
        notifs().set(subscription_id, []);
      }
      userStore.set(uid, {
        graph_access_token: token.token.access_token,
        graph_user_name: user.name,
        subscription_id: sub_id
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
  logout
};
