# Design notes

## Swipes when the network drops

A failed ID lookup is reported as "not checked", never as a denial, and is not written to `invalidSwipeIns`. Only the server rejecting the ID's format counts as a denial. The lookup gives up after 15 s so a dead connection cannot hang the desk; a cold start that outlasts it costs one re-swipe.

Firestore writes do not resolve offline, so the UI waits 5 s for confirmation and then says the entry is queued. It does not ask for a re-swipe: the queued write still lands on reconnect, so a second swipe would double count.

Firestore keeps the default memory cache, so queued writes are lost if the tab reloads while offline. A persistent cache would survive that but would leave roster names and hashes in IndexedDB on a shared desk computer, which is the worse trade for confidential student data.
