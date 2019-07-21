let router = require("express").Router();
let { permissioned, login } = require("./helpers");

router.get("/login", login);
router.get("/logout", permissioned(), (req, res) => {
  res.clearCookie("graph_access_token");
  res.clearCookie("graph_access_user");
  return res.redirect("/");
});
router.get("/calendars", permissioned(), (req, res) => {
  // GET calendars
  return res.render("index", { echo: "get /calendars" });
});
router.get("/calendar/:calendar_id/events", permissioned(), (req, res) => {
  // GET events from the calendar with :calendar_id
  return res.render("index", {
    echo: "get /events of /calendar/" + req.params.calendar_id
  });
});
router.put(
  "/calendar/:calendar_id/event/:event_id",
  permissioned(),
  (req, res) => {
    // Update event from the calendar
    return res.render("index", {
      echo: `put /event/${req.params.calendar_id} of /calendar/${
        req.params.event_id
      }`
    });
  }
);
router.delete(
  "/calendar/:calendar_id/event/:event_id",
  permissioned(),
  (req, res) => {
    //Delete event from the calendar
    return res.render("index", {
      echo: `delete /event/${req.params.calendar_id} of /calendar/${
        req.params.event_id
      }`
    });
  }
);
router.post("/calendar/:calendar_id/event", permissioned(), (req, res) => {
  //Create event in the calendar
  return res.render("index", {
    echo: `create /event in /calendar/${req.params.event_id}`
  });
});
router.all("/", (req, res) => {
  if (req.cookies && req.cookies.graph_access_token) {
    return res.render("index", {
      user: {
        token: req.cookies.graph_access_token,
        name: req.cookies.graph_user_name
      }
    });
  } else {
    return res.render("index", { user: null });
  }
});
module.exports = router;
