let router = require("express").Router();
let { permissioned, login } = require("./helpers");
let graph = require("@microsoft/microsoft-graph-client");
router.get("/login", login);
router.get("/logout", permissioned(), (req, res) => {
  res.clearCookie("graph_access_token");
  res.clearCookie("graph_access_user");
  res.clearCookie("graph_refresh_token");
  res.clearCookie("graph_token_expires");
  return res.redirect("/");
});
router.get("/get-events", permissioned(), async (req, res) => {
  const accessToken = req.cookies.graph_access_token;
  const userName = req.cookies.graph_user_name;
  let parms = {};
  if (accessToken && userName) {
    parms.user = userName;

    // Initialize Graph client
    const client = graph.Client.init({
      authProvider: done => {
        done(null, accessToken);
      }
    });

    // Set start of the calendar view to today at midnight
    const start = new Date(new Date().setHours(0, 0, 0));
    // Set end of the calendar view to 7 days from start
    const end = new Date(new Date(start).setDate(start.getDate() + 7));

    try {
      // Get the first 10 events for the coming week
      const result = await client
        .api(
          `/me/calendarView?startDateTime=${start.toISOString()}&endDateTime=${end.toISOString()}`
        )
        .top(10)
        .select("subject,start,end,attendees")
        .orderby("start/dateTime DESC")
        .get();

      parms.events = result.value;
      res.render("index", {
        ...parms,
        user: { token: accessToken },
        content_key: "events"
      });
    } catch (err) {
      parms.message = "Error retrieving events";
      parms.error = { status: `${err.code}: ${err.message}` };
      res.render("error", { ...parms, content_key: "error" });
    }
  } else {
    // Redirect to home
    res.redirect("/");
  }
});
router.get("/create-event", permissioned(), async (req, res) => {
  //Create event in the calendar
  const accessToken = req.cookies.graph_access_token;
  const userName = req.cookies.graph_user_name;
  const { subject, content, from, to, where } = req.query;
  let parms = {};
  if (accessToken && userName && subject && content && from && to && where) {
    parms.user = userName;

    // Initialize Graph client
    const client = graph.Client.init({
      authProvider: done => {
        done(null, accessToken);
      }
    });
    const event = {
      subject,
      body: {
        contentType: "HTML",
        content
      },
      start: {
        dateTime: from,
        timeZone: "Asia/Kolkata"
      },
      end: {
        dateTime: to,
        timeZone: "Asia/Kolkata"
      },
      location: {
        displayName: where
      }
    };
    try {
      await client.api("/me/events").post(event);
      return res.redirect("/get-events");
    } catch (err) {
      return res.render("index", { ...err, content_key: "error" });
    }
  } else {
    return res.redirect("/get-events");
  }
});
router.get("/create-event-page", permissioned(), (req, res) => {
  return res.render("index", {
    content_key: "event",
    user: { token: req.cookies.graph_access_token }
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
