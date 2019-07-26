const POLLING_INTERVAL = 30000; // 30 sec

async function getEventUpdates() {
  let event_updates = document.getElementById("event-updates");
  try {
    event_updates.innerHTML = "loading updates";
    let updates = await fetch("/get-event-updates");
    if (updates.length) {
      event.updates.innerHTML = "<a href=/get-events-page>Refresh</a>";
    }
    console.info("-----updates------");
    updates.forEach(update => console.table(update.resource));
    console.info("-------------------");
  } catch (err) {
    event_updates.innerHTML = "Error retrieving updates";
    console.error("Error while retrieving updates");
    console.error(err);
  }
}

setInterval(getEventUpdates, POLLING_INTERVAL);
