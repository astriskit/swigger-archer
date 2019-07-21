let jwt = require("jsonwebtoken");
require("dotenv").config();

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
const clearSession = () => {};
const permissioned = (
  redirectTo = "/",
  checker = req => req.cookies && req.cookies.graph_access_token
) => (req, res, next) => {
  if (checker(req)) {
    next();
  } else {
    return res.redirect(403, redirectTo);
  }
};
const login = async (req, res) => {
  if (req.cookies && req.cookies.graph_access_token) {
    // a valid OAuth2 token from the client-cookie
    return redirect("/");
  } else if (req.query.code) {
    // if the OAuth2 is successful
    try {
      let token = await getTokenFromCode(req.query.code);
      // Parse the identity token
      const user = jwt.decode(token.token.id_token);
      // Save the access token in a cookie
      res.cookie("graph_access_token", token.token.access_token, {
        maxAge: 3600000
      });
      // Save the user's name in a cookie
      res.cookie("graph_user_name", user.name, { maxAge: 3600000 });
      return res.redirect("/");
    } catch (err) {
      return res.redirect("/");
    }
  } else {
    // redirect to login from microsoft
    return res.redirect(createSignInLink());
  }
};
module.exports = {
  createSignInLink,
  clearSession,
  permissioned,
  login
};
