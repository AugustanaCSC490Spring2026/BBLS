import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { requireAdmin } from "./auth.js";
import { ROSTER_COLLECTION } from "./roster.js";

const TIME_ZONE = "America/Chicago";

const FACILITIES = {
  Both: ["pepsicoCenter", "westerlinGym"],
  PepsiCo: ["pepsicoCenter"],
  Westerlin: ["westerlinGym"],
};
const FACILITY_LABELS = { pepsicoCenter: "PepsiCo Center", westerlinGym: "Westerlin Gym" };
const CHECKOUT_LOCATIONS = { Both: null, PepsiCo: "PepsiCo Center", Westerlin: "Westerlin Gym" };
const RANGE_DAYS = { "Last 7 Days": 7, "Last 30 Days": 30, "Last 90 Days": 90 };
const RANGES = [...Object.keys(RANGE_DAYS), "This Year", "All Time"];
const INTERVALS = ["Hourly", "Daily", "Weekly", "Monthly"];

const HOUR_LABELS = Array.from({ length: 24 }, (_, h) => `${h % 12 || 12} ${h < 12 ? "AM" : "PM"}`);
const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const DEMOGRAPHICS = {
  "Class": { field: "Class" },
  "Transfer Status": { field: "Transfer", map: (raw) => (raw === "Yes" ? "Transfer" : "Not a Transfer") },
  "Residence Hall": { field: "Residence" },
  "International": { field: "International", map: (raw) => (raw && raw.toLowerCase() !== "domestic" ? "International" : "Domestic") },
};
const ROSTER_FIELDS = ["PersonType", ...Object.values(DEMOGRAPHICS).map((d) => d.field)];

const partsFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  weekday: "short",
  hourCycle: "h23",
});
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function localParts(date) {
  const p = Object.fromEntries(partsFormat.formatToParts(date).map(({ type, value }) => [type, value]));
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour % 24, wd: WEEKDAYS.indexOf(p.weekday) };
}

const pad = (n) => String(n).padStart(2, "0");
const calendarDay = (y, m, d) => new Date(Date.UTC(y, m - 1, d));
const dayKey = (date) => date.toISOString().slice(0, 10);
const utcLabel = (date, opts) => date.toLocaleString("en-US", { timeZone: "UTC", ...opts });

function rangeStartKey(range, now) {
  const { y, m, d } = localParts(now);
  if (range === "This Year") return `${y}-01-01`;
  if (RANGE_DAYS[range]) return dayKey(calendarDay(y, m, d - RANGE_DAYS[range]));
  return null;
}

function bucketFor({ y, m, d, h, wd }, interval) {
  if (interval === "Hourly") {
    return {
      key: `${y}-${pad(m)}-${pad(d)}-${pad(h)}`,
      label: utcLabel(new Date(Date.UTC(y, m - 1, d, h)), { month: "short", day: "numeric", hour: "numeric" }),
    };
  }
  if (interval === "Weekly") {
    const start = calendarDay(y, m, d - wd);
    return { key: dayKey(start), label: utcLabel(start, { month: "short", day: "numeric" }) };
  }
  if (interval === "Monthly") {
    return { key: `${y}-${pad(m)}`, label: utcLabel(calendarDay(y, m, 1), { month: "short", year: "numeric" }) };
  }
  return { key: `${y}-${pad(m)}-${pad(d)}`, label: utcLabel(calendarDay(y, m, d), { month: "short", day: "numeric" }) };
}

const increment = (map, key) => map.set(key, (map.get(key) || 0) + 1);

/** Top 5 values plus one "Other" segment for the rest. */
function topWithOther(counts) {
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const segments = sorted.slice(0, 5).map(([label, value]) => ({ label, value }));
  const other = sorted.slice(5).reduce((sum, [, value]) => sum + value, 0);
  if (other > 0) segments.push({ label: "Other", value: other });
  return segments;
}

function argmaxLabel(counts, labels) {
  const max = Math.max(...counts);
  return max > 0 ? labels[counts.indexOf(max)] : null;
}

/**
 * Turns raw roster, visit, and checkout records into the counts the
 * Analytics page charts. Nothing per-person leaves this function.
 * @param {{roster: Map<string, object>, visits: Object<string, Array<{id: string, at: Date}>>,
 *          checkouts: Array<{item: string, location: string, at: Date|null}>}} data
 */
export function summarize(data, { facility, timeRange, timeInterval }, now = new Date()) {
  const startKey = rangeStartKey(timeRange, now);
  const inRange = (parts) => !startKey || `${parts.y}-${pad(parts.m)}-${pad(parts.d)}` >= startKey;

  let totalVisits = 0;
  const unique = new Set();
  const hourCounts = new Array(24).fill(0);
  const dayCounts = new Array(7).fill(0);
  const buckets = new Map();
  const visitsByFacility = [];
  const personTypes = new Map();
  const demographics = Object.fromEntries(Object.keys(DEMOGRAPHICS).map((dim) => [dim, new Map()]));

  for (const name of FACILITIES[facility]) {
    let facilityVisits = 0;
    for (const { id, at } of data.visits[name] || []) {
      const parts = localParts(at);
      if (!inRange(parts)) continue;
      totalVisits++;
      facilityVisits++;
      if (id) unique.add(id);
      hourCounts[parts.h]++;
      dayCounts[parts.wd]++;

      const bucket = bucketFor(parts, timeInterval);
      const existing = buckets.get(bucket.key);
      if (existing) existing.visits++;
      else buckets.set(bucket.key, { label: bucket.label, visits: 1 });

      const person = data.roster.get(id);
      increment(personTypes, String(person?.PersonType ?? "").trim() || "Unknown");
      for (const [dim, { field, map }] of Object.entries(DEMOGRAPHICS)) {
        const raw = String(person?.[field] ?? "").trim();
        increment(demographics[dim], person ? (map ? map(raw) : raw || "Unknown") : "Unknown");
      }
    }
    visitsByFacility.push({ facility: FACILITY_LABELS[name], visits: facilityVisits });
  }

  const location = CHECKOUT_LOCATIONS[facility];
  const items = new Map();
  for (const { item, location: where, at } of data.checkouts) {
    if (!item || (location && where !== location)) continue;
    if (startKey && (!at || !inRange(localParts(at)))) continue;
    increment(items, item);
  }
  const topEquipment = [...items.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([item, count]) => ({ item, count }));

  return {
    stats: {
      totalVisits,
      uniqueVisitors: unique.size,
      mostCheckedOutItem: topEquipment[0]?.item ?? null,
      peakHour: argmaxLabel(hourCounts, HOUR_LABELS),
      busiestDay: argmaxLabel(dayCounts, DAY_LABELS),
    },
    visitsOverTime: [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, b]) => b),
    visitsByFacility,
    personTypeMix: topWithOther(personTypes),
    demographics: Object.fromEntries(Object.entries(demographics).map(([dim, c]) => [dim, topWithOther(c)])),
    topEquipment,
  };
}

const toDate = (ts) => (ts && typeof ts.toDate === "function" ? ts.toDate() : null);

export const analyticsSummary = onCall({ memory: "512MiB" }, async (request) => {
  await requireAdmin(request);
  const params = {
    facility: request.data?.facility,
    timeRange: request.data?.timeRange,
    timeInterval: request.data?.timeInterval,
  };
  if (!FACILITIES[params.facility] || !RANGES.includes(params.timeRange) || !INTERVALS.includes(params.timeInterval)) {
    throw new HttpsError("invalid-argument", "Unknown facility, range, or interval.");
  }

  const db = getFirestore();
  const [rosterSnap, checkoutSnap, ...visitSnaps] = await Promise.all([
    db.collection(ROSTER_COLLECTION).select(...ROSTER_FIELDS).get(),
    db.collection("checkoutHistory").select("item", "location", "time").get(),
    ...FACILITIES[params.facility].map((name) => db.collection(name).select("ID", "swipeInTime").get()),
  ]);

  const roster = new Map(rosterSnap.docs.map((d) => [d.id, d.data()]));
  const visits = {};
  FACILITIES[params.facility].forEach((name, i) => {
    visits[name] = visitSnaps[i].docs
      .map((d) => ({ id: d.get("ID"), at: toDate(d.get("swipeInTime")) }))
      .filter((v) => v.at);
  });
  const checkouts = checkoutSnap.docs.map((d) => ({
    item: d.get("item"),
    location: d.get("location"),
    at: toDate(d.get("time")),
  }));

  return summarize({ roster, visits, checkouts }, params);
});
