# Design notes

## Swipes when the network drops

A failed ID lookup is reported as "not checked", never as a denial, and is not written to `invalidSwipeIns`. Only the server rejecting the ID's format counts as a denial. The lookup gives up after 15 s so a dead connection cannot hang the desk; a cold start that outlasts it costs one re-swipe.

Firestore writes do not resolve offline, so the UI waits 5 s for confirmation and then says the entry is queued. It does not ask for a re-swipe: the queued write still lands on reconnect, so a second swipe would double count.

Firestore keeps the default memory cache, so queued writes are lost if the tab reloads while offline. A persistent cache would survive that but would leave roster names and hashes in IndexedDB on a shared desk computer, which is the worse trade for confidential student data.

## App Check

The web app attests with reCAPTCHA Enterprise, which needs no stored secret, unlike v3. The site key is public and limited to the two hosting domains, so it lives in `src/Firebase.js`.

App Check only runs in production builds. Localhost cannot sign in against prod because of the API key's referrer restriction, and the emulators do not check tokens, so a debug token would add nothing today.

Enforcement stays off until real desk traffic shows valid tokens: reCAPTCHA scores a quiet kiosk browser, and a low score under enforcement would lock the desk out. Blocking functions are called by Auth and cannot take App Check.

## Recovering Firestore

The `(default)` database has delete protection, point-in-time recovery (7 days, whole-minute snapshots) and a daily backup kept for 14 days. Point-in-time recovery handles a bad write noticed within the week. Backups cover the second week.

Restores always create a new database, so nothing the app reads changes until data is copied back:

```
gcloud firestore databases clone --project=rec-center-swipe-ins --source-database='projects/rec-center-swipe-ins/databases/(default)' --snapshot-time=2026-01-01T12:00:00Z --destination-database=restore-temp
gcloud firestore backups list --project=rec-center-swipe-ins --format='table(name,snapshotTime)'
gcloud firestore databases restore --project=rec-center-swipe-ins --source-backup=<backup name> --destination-database=restore-temp
```

Copy data back with `gcloud firestore export` from the temporary database and `gcloud firestore import` into `(default)`. Import overwrites documents with the same ID and leaves others in place, so documents created after the snapshot stay. Export needs a Cloud Storage bucket: treat it as confidential and delete it afterward, along with the temporary database.

A clone of production was tested on 2026-11-05 and took about 10 minutes for 1,981 documents. All 12 collections and their documents matched. Restoring from a backup and importing back into `(default)` have not been tried.

## Browser API key

The live bundle uses the API key limited to the two hosting domains. PR preview hosts are not on that list, because allowing them would take a wildcard over all of `web.app`. So previews can load but cannot sign in, and sign-in gets checked on the live site or against the emulators.

## Rotating ID_HMAC_KEY

Roster documents are keyed by the hash of each ID, so a new key means nobody matches until the roster is imported again. Add the new secret version, deploy `hashStudentId` and `importRoster`, import the roster, then disable the old version.

Past swipes keep their old hashes and cannot be linked to the new roster, so they show as Unknown in analytics.
