const add_scheme = (host, https = false) => {
  return https ? "https://" + host : "http://" + host;
};
const add_port = host => {
  if (!process.env["NODE_ENV"]) {
    return host + ":" + config.port.http;
  } else if (process.env.NODE_ENV && process.env.NODE_ENV === "development") {
    if (process.env._SECURE_HTTP) {
      return host + ":" + config.port.https;
    } else {
      return host + ":" + config.port.http;
    }
  } else {
    return host;
  }
};
const config = {
  port: { http: 3000, https: 3443 },
  views: "views",
  local_host: "localhost",
  prod_host: "astriskit-swigger-archer.glitch.me",
  redirect_path: "/login",
  notif_path: "/notifs"
};
config.local_fqdn = add_port(
  add_scheme(config.local_host, process.env["_SECURE_HTTP"])
);
config.prod_fqdn = add_scheme(config.prod_host, true);
config.redirect_uri =
  process.env.NODE_ENV === "production"
    ? config.prod_fqdn + config.redirect_path
    : config.local_fqdn + config.redirect_path;
config.notif_uri =
  process.env.NODE_ENV === "production"
    ? config.prod_fqdn + config.notif_path
    : config.local_fqdn + config.notif_path;
module.exports = config;
