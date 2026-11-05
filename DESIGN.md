# Design notes

## Swipes when the network drops

A failed ID lookup is reported as "not checked", never as a denial, and is not written to `invalidSwipeIns`. Only the server rejecting the ID's format counts as a denial. The lookup gives up after 15 s so a dead connection cannot hang the desk; a cold start that outlasts it costs one re-swipe.

Firestore writes do not resolve offline, so the UI waits 5 s for confirmation and then says the entry is queued. It does not ask for a re-swipe: the queued write still lands on reconnect, so a second swipe would double count.

Firestore keeps the default memory cache, so queued writes are lost if the tab reloads while offline. A persistent cache would survive that but would leave roster names and hashes in IndexedDB on a shared desk computer, which is the worse trade for confidential student data.

## App Check

The web app attests with reCAPTCHA Enterprise, which needs no stored secret, unlike v3. The site key is public and limited to the two hosting domains, so it lives in `src/Firebase.js`.

App Check only runs in production builds. Localhost cannot sign in against prod because of the API key's referrer restriction, and the emulators do not check tokens, so a debug token would add nothing today.

Enforcement stays off until real desk traffic shows valid tokens: reCAPTCHA scores a quiet kiosk browser, and a low score under enforcement would lock the desk out. Blocking functions are called by Auth and cannot take App Check.
