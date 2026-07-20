import React, { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { db } from "../Firebase";
import "../components/Analytics.css";
import NavDropdown from "../components/NavDropdownAnalytics.jsx";
import TimeRangeFilter from "../components/TimeRangeFilter.jsx";

const FACILITY_COLLECTIONS = {
  Both: ["pepsicoCenter", "westerlinGym"],
  PepsiCo: ["pepsicoCenter"],
  Westerlin: ["westerlinGym"],
};

const FACILITY_LOCATIONS = {
  Both: null,
  PepsiCo: "PepsiCo Center",
  Westerlin: "Westerlin Gym",
};

const FACILITY_COLLECTION_LABELS = {
  pepsicoCenter: "PepsiCo Center",
  westerlinGym: "Westerlin Gym",
};

const HOUR_LABELS = [
  "12 AM", "1 AM", "2 AM", "3 AM", "4 AM", "5 AM", "6 AM", "7 AM",
  "8 AM", "9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM",
  "4 PM", "5 PM", "6 PM", "7 PM", "8 PM", "9 PM", "10 PM", "11 PM",
];

const DAY_LABELS = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

function getRangeStartDate(range) {
  const now = new Date();
  switch (range) {
    case "Last 7 Days":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    case "Last 30 Days":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
    case "Last 90 Days":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90);
    case "This Year":
      return new Date(now.getFullYear(), 0, 1);
    case "All Time":
    default:
      return null;
  }
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function startOfWeek(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - d.getDay());
  return d;
}

// Sortable key + display label for the bucket a visit's timestamp falls into,
// based on the selected time interval granularity.
function getBucket(date, interval) {
  const y = date.getFullYear();
  const m = date.getMonth();
  const day = date.getDate();

  switch (interval) {
    case "Hourly": {
      const h = date.getHours();
      return {
        key: `${y}-${pad2(m + 1)}-${pad2(day)}-${pad2(h)}`,
        label: date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric" }),
      };
    }
    case "Weekly": {
      const weekStart = startOfWeek(date);
      return {
        key: `${weekStart.getFullYear()}-${pad2(weekStart.getMonth() + 1)}-${pad2(weekStart.getDate())}`,
        label: weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      };
    }
    case "Monthly":
      return {
        key: `${y}-${pad2(m + 1)}`,
        label: date.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      };
    case "Daily":
    default:
      return {
        key: `${y}-${pad2(m + 1)}-${pad2(day)}`,
        label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      };
  }
}

function Analytics({ gym, updateGym }) {
  // Which facility's data the stat cards (and eventually the charts) reflect.
  const [facility, setFacility] = useState("Both");
  const [timeInterval, setTimeInterval] = useState("Daily");
  const [timeRange, setTimeRange] = useState("Last 30 Days");


  const [statData, setStatData] = useState({
    totalVisits: null,
    uniqueVisitors: null,
    mostCheckedOutItem: null,
    peakHour: null,
    busiestDay: null,
  });

  const [visitsOverTime, setVisitsOverTime] = useState([]);
  const [visitsByFacility, setVisitsByFacility] = useState([]);

  useEffect(() => {
    async function fetchStatCardData() {
      let totalVisits = 0;
      const uniqueIds = new Set();
      const hourCounts = new Array(24).fill(0);
      const dayCounts = new Array(7).fill(0);
      const rangeStart = getRangeStartDate(timeRange);
      const visitBuckets = new Map();
      const visitsByFacilityData = [];

      try {
        for (const name of FACILITY_COLLECTIONS[facility]) {
          const snap = await getDocs(collection(db, name));
          let facilityVisitCount = 0;
          snap.forEach((doc) => {
            const d = doc.data();
            if (!d.swipeInTime || !d.swipeInTime.toDate) return;
            const visitDate = d.swipeInTime.toDate();
            if (rangeStart && visitDate < rangeStart) return;
            totalVisits++;
            facilityVisitCount++;
            if (d.ID) uniqueIds.add(d.ID);
            hourCounts[visitDate.getHours()]++;
            dayCounts[visitDate.getDay()]++;

            const bucket = getBucket(visitDate, timeInterval);
            const existing = visitBuckets.get(bucket.key);
            if (existing) {
              existing.visits++;
            } else {
              visitBuckets.set(bucket.key, { label: bucket.label, visits: 1 });
            }
          });
          visitsByFacilityData.push({ facility: FACILITY_COLLECTION_LABELS[name], visits: facilityVisitCount });
        }
      } catch (err) {
        console.error("Stat card fetch error:", err);
      }

      const visitsOverTimeData = Array.from(visitBuckets.entries())
        .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
        .map(([, bucket]) => bucket);

      const itemCounts = {};
      try {
        const locationFilter = FACILITY_LOCATIONS[facility];
        const snap = await getDocs(collection(db, "checkoutHistory"));
        snap.forEach((doc) => {
          const d = doc.data();
          if (!d.item) return;
          if (locationFilter && d.location !== locationFilter) return;
          if (rangeStart) {
            const historyDate = d.time && d.time.toDate ? d.time.toDate() : null;
            if (!historyDate || historyDate < rangeStart) return;
          }
          itemCounts[d.item] = (itemCounts[d.item] || 0) + 1;
        });
      } catch (err) {
        console.error("Equipment checkout fetch error:", err);
      }

      const peakHourIndex = hourCounts.some((c) => c > 0)
        ? hourCounts.indexOf(Math.max(...hourCounts))
        : null;

      const busiestDayIndex = dayCounts.some((c) => c > 0)
        ? dayCounts.indexOf(Math.max(...dayCounts))
        : null;

      const itemEntries = Object.entries(itemCounts);
      const mostCheckedOutItem = itemEntries.length
        ? itemEntries.reduce((max, entry) => (entry[1] > max[1] ? entry : max))[0]
        : null;

      setStatData({
        totalVisits,
        uniqueVisitors: uniqueIds.size,
        mostCheckedOutItem,
        peakHour: peakHourIndex === null ? null : HOUR_LABELS[peakHourIndex],
        busiestDay: busiestDayIndex === null ? null : DAY_LABELS[busiestDayIndex],
      });
      setVisitsOverTime(visitsOverTimeData);
      setVisitsByFacility(visitsByFacilityData);
    }

    fetchStatCardData();
  }, [facility, timeRange, timeInterval]);

  const CHART_TITLES = [
    "Visits Over Time",
    "Visits by Facility",
    "Person Type Mix",
    "Top 5 Equipment",
    "Demographic Snapshot",
  ];

  function renderChartBody(title) {
    if (title === "Visits Over Time") {
      if (!visitsOverTime.length) return <span>No visit data for this range</span>;
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={visitsOverTime} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#eee" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#999" }} stroke="#eee" tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#999" }} stroke="#eee" tickLine={false} width={32} />
            <Tooltip
              cursor={{ stroke: "#e2e2e2", strokeWidth: 1 }}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e2e2" }}
              labelStyle={{ color: "#666", fontWeight: 600 }}
            />
            <Line
              type="monotone"
              dataKey="visits"
              stroke="#002F6C"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: "#fff", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (title === "Visits by Facility") {
      if (!visitsByFacility.length) return <span>No visit data for this range</span>;
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={visitsByFacility} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#eee" />
            <XAxis dataKey="facility" tick={{ fontSize: 11, fill: "#999" }} stroke="#eee" tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#999" }} stroke="#eee" tickLine={false} width={32} />
            <Tooltip
              cursor={{ fill: "#f5f5f5" }}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e2e2" }}
              labelStyle={{ color: "#666", fontWeight: 600 }}
            />
            <Bar dataKey="visits" fill="#002F6C" radius={[4, 4, 0, 0]} maxBarSize={64} />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    return "Chart coming soon";
  }

  const IMPLEMENTED_CHARTS = new Set(["Visits Over Time", "Visits by Facility"]);

  // Same shape as your original renderStatCard, just without the
  // week-over-week trend arrow for now (no "last period" number to compare
  // against yet since we're doing a flat total instead of this-week/last-week).
  function renderStatCard(title, value, accent) {
    const loading = value === null;
    return (
      <div className={`stat-card ${accent}`}>
        <p className="sc-label">{title}</p>
        <p className="sc-value">{loading ? "—" : value.toLocaleString()}</p>
      </div>
    );
  }

  return (
    <>
      <div className="page-header" />

      <div className="Analytics-page">
        <div className="filter-row">
          <TimeRangeFilter
            interval={timeInterval}
            range={timeRange}
            onIntervalChange={setTimeInterval}
            onRangeChange={setTimeRange}
          />
          <NavDropdown
            options={["Both", "PepsiCo", "Westerlin"]}
            defaultOption={facility}
            onChange={setFacility}
          />
        </div>

        <div className="stat-card-row">
          {renderStatCard("TOTAL VISITS", statData.totalVisits, "accent-gold")}
          {renderStatCard("UNIQUE VISITORS", statData.uniqueVisitors, "accent-navy")}
          {renderStatCard("MOST CHECKED OUT ITEM", statData.mostCheckedOutItem, "accent-gold")}
          {renderStatCard("PEAK HOUR", statData.peakHour, "accent-navy")}
          {renderStatCard("BUSIEST DAY", statData.busiestDay, "accent-gold")}
        </div>

        <div className="chart-grid">
          {CHART_TITLES.map((title) => {
            const implemented = IMPLEMENTED_CHARTS.has(title);
            return (
              <div className={`chart-card ${implemented ? "" : "chart-card-placeholder"}`} key={title}>
                <p className="chart-card-title">{title}</p>
                <div className={`chart-card-body ${implemented ? "chart-card-body-chart" : ""}`}>
                  {renderChartBody(title)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

export default Analytics;
