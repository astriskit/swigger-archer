const POLLING_INTERVAL = 30000; // 30 sec

async function getEventUpdates() {
  let event_updates = document.getElementById("event-updates");
  try {
    event_updates.innerHTML = "loading updates";
    let res = await fetch("/get-event-updates");
    if (res.status !== 200) {
      throw new Error("forbidden");
    }
    let updates = await res.json();
    if (updates.length) {
      event_updates.innerHTML = "<a href=/get-events>Refresh</a>";
      clearInterval(intervalId);
    } else {
      event_updates.innerHTML =
        "No updates found. Will check in ~" +
        POLLING_INTERVAL / 1000 +
        " seconds.";
    }
    console.table(updates);
  } catch (err) {
    if (err.message === "forbidden") {
      clearInterval(intervalId);
      event_updates.innerHTML = "Re-login.";
    } else {
      event_updates.innerHTML = "Error retrieving updates";
      console.error("Error while retrieving updates");
    }
    console.error(err);
  }
}

let intervalId = setInterval(getEventUpdates, POLLING_INTERVAL);
