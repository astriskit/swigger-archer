let jsonWebToken = require("jsonwebtoken");
let simpleOAuth2 = require("simple-oauth2");
let env = require("dotenv").config();

const createSignInLink = () => {};
const clearSession = () => {};
const startSession = () => {};

const permissioned = (redirectTo = "/") => (req, res, next) => {
  if (req.cookies.token) {
    next();
  } else {
    res.redirect(403, redirectTo);
  }
};

module.exports = { createSignInLink, clearSession, startSession, permissioned };
