import React, { useState, useEffect, useRef } from "react";
import { collection, getDocs } from "firebase/firestore";
import Papa from "papaparse";
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
  LabelList,
} from "recharts";
import { db } from "../Firebase";
import "../components/Analytics.css";
import NavDropdown from "../components/NavDropdownAnalytics.jsx";
import TimeRangeFilter from "../components/TimeRangeFilter.jsx";
import ChartExportMenu from "../components/ChartExportMenu.jsx";

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

// Validated CVD-safe categorical order (see dataviz skill palette) — assigned
// by rank so the same slots are always used in the same order, never cycled.
const CATEGORY_HUES = ["#2a78d6", "#008300", "#e87ba4", "#eda100", "#1baf7a"];
const CATEGORY_OTHER_COLOR = "#898781";

// Keeps the top 5 most common values in a counts map as their own segment
// and folds everything past that into a single "Other" segment. Used for
// any part-to-whole category mix (person type, gender, etc).
function buildCategoryMix(counts) {
  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 5);
  const rest = sorted.slice(5);
  const otherTotal = rest.reduce((sum, [, count]) => sum + count, 0);

  const segments = top.map(([label, value], i) => ({ label, value, color: CATEGORY_HUES[i] }));
  if (otherTotal > 0) {
    segments.push({ label: "Other", value: otherTotal, color: CATEGORY_OTHER_COLOR });
  }
  return segments;
}

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

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportRowsAsCsv(rows, filename) {
  if (!rows.length) return;
  const blob = new Blob([Papa.unparse(rows)], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, filename);
}

// Rasterizes a chart card's recharts <svg> to a PNG at 2x for crisper export.
function exportSvgAsPng(containerEl, filename) {
  const svgEl = containerEl && containerEl.querySelector("svg");
  if (!svgEl) return;

  const { width, height } = svgEl.getBoundingClientRect();
  const scale = 2;
  const svgString = new XMLSerializer().serializeToString(svgEl);
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, filename);
    }, "image/png");
  };
  img.src = url;
}

// A category mix (Person Type Mix, Demographic Snapshot) has an HTML legend
// alongside its SVG bar, so it's drawn straight from the underlying data
// instead of rasterizing the DOM.
function exportCategoryMixPng(segments, filename) {
  const total = segments.reduce((sum, seg) => sum + seg.value, 0);
  if (!total) return;

  const scale = 2;
  const width = 640;
  const padding = 24;
  const barHeight = 48;
  const rowHeight = 24;
  const height = padding * 2 + barHeight + 16 + segments.length * rowHeight;

  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  const barWidth = width - padding * 2;
  const gap = 2;
  let x = padding;
  segments.forEach((seg) => {
    const segWidth = (seg.value / total) * barWidth;
    ctx.fillStyle = seg.color;
    ctx.fillRect(x, padding, Math.max(segWidth - gap, 0), barHeight);
    x += segWidth;
  });

  ctx.font = "13px system-ui, -apple-system, sans-serif";
  ctx.textBaseline = "middle";
  let legendY = padding + barHeight + 16 + rowHeight / 2;
  segments.forEach((seg) => {
    ctx.fillStyle = seg.color;
    ctx.fillRect(padding, legendY - 5, 10, 10);
    ctx.fillStyle = "#444444";
    const pct = Math.round((seg.value / total) * 100);
    ctx.fillText(`${seg.label} — ${pct}%`, padding + 18, legendY);
    legendY += rowHeight;
  });

  canvas.toBlob((blob) => {
    if (blob) downloadBlob(blob, filename);
  }, "image/png");
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
  const [personTypeMix, setPersonTypeMix] = useState([]);
  const [demographicMix, setDemographicMix] = useState([]);
  const [topEquipment, setTopEquipment] = useState([]);

  const chartBodyRefs = useRef({});

  useEffect(() => {
    async function fetchStatCardData() {
      let totalVisits = 0;
      const uniqueIds = new Set();
      const hourCounts = new Array(24).fill(0);
      const dayCounts = new Array(7).fill(0);
      const rangeStart = getRangeStartDate(timeRange);
      const visitBuckets = new Map();
      const visitsByFacilityData = [];
      const personTypeCounts = new Map();
      const genderCounts = new Map();

      try {
        const studentsSnap = await getDocs(collection(db, "currentStudents"));
        const personTypeById = new Map();
        const genderById = new Map();
        studentsSnap.forEach((doc) => {
          const data = doc.data();
          const type = (data.PersonType || "").trim();
          personTypeById.set(doc.id, type || "Unknown");
          const gender = (data.Gender || "").trim();
          genderById.set(doc.id, gender || "Unknown");
        });

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

            const personType = personTypeById.get(d.ID) || "Unknown";
            personTypeCounts.set(personType, (personTypeCounts.get(personType) || 0) + 1);

            const gender = genderById.get(d.ID) || "Unknown";
            genderCounts.set(gender, (genderCounts.get(gender) || 0) + 1);
          });
          visitsByFacilityData.push({ facility: FACILITY_COLLECTION_LABELS[name], visits: facilityVisitCount });
        }
      } catch (err) {
        console.error("Stat card fetch error:", err);
      }

      const visitsOverTimeData = Array.from(visitBuckets.entries())
        .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
        .map(([, bucket]) => bucket);

      const personTypeMixData = buildCategoryMix(personTypeCounts);
      const demographicMixData = buildCategoryMix(genderCounts);

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

      const topEquipmentData = Object.entries(itemCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([item, count]) => ({ item, count }));

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
      setPersonTypeMix(personTypeMixData);
      setDemographicMix(demographicMixData);
      setTopEquipment(topEquipmentData);
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

    if (title === "Person Type Mix") {
      if (!personTypeMix.length) return <span>No visit data for this range</span>;
      return renderCategoryMixChart(personTypeMix);
    }

    if (title === "Demographic Snapshot") {
      if (!demographicMix.length) return <span>No visit data for this range</span>;
      return renderCategoryMixChart(demographicMix);
    }

    if (title === "Top 5 Equipment") {
      if (!topEquipment.length) return <span>No checkout data for this range</span>;
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={topEquipment} layout="vertical" margin={{ top: 8, right: 28, left: 8, bottom: 0 }}>
            <CartesianGrid horizontal={false} stroke="#eee" />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#999" }} stroke="#eee" tickLine={false} />
            <YAxis
              type="category"
              dataKey="item"
              width={110}
              tick={{ fontSize: 11, fill: "#444" }}
              stroke="#eee"
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "#f5f5f5" }}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e2e2" }}
              labelStyle={{ color: "#666", fontWeight: 600 }}
            />
            <Bar dataKey="count" fill="#002F6C" radius={[0, 4, 4, 0]} maxBarSize={20}>
              <LabelList dataKey="count" position="right" style={{ fontSize: 11, fill: "#666" }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    }

    return "Chart coming soon";
  }

  // Shared render for any part-to-whole category mix: a single 100%-stacked
  // horizontal bar plus a swatch legend with direct percentage labels.
  function renderCategoryMixChart(segments) {
    const total = segments.reduce((sum, seg) => sum + seg.value, 0);
    const chartRow = { name: "Visits" };
    segments.forEach((seg) => {
      chartRow[seg.label] = seg.value;
    });

    return (
      <div className="category-mix">
        <div className="category-mix-bar">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[chartRow]} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" hide />
              <Tooltip
                cursor={{ fill: "transparent" }}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e2e2" }}
                labelFormatter={() => ""}
                formatter={(value, label) => [`${value.toLocaleString()} (${Math.round((value / total) * 100)}%)`, label]}
              />
              {segments.map((seg) => (
                <Bar key={seg.label} dataKey={seg.label} stackId="mix" fill={seg.color} stroke="#fff" strokeWidth={2} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="category-mix-legend">
          {segments.map((seg) => (
            <div className="category-mix-legend-item" key={seg.label}>
              <span className="category-mix-swatch" style={{ backgroundColor: seg.color }} />
              <span className="category-mix-legend-label">{seg.label}</span>
              <span className="category-mix-legend-value">{Math.round((seg.value / total) * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const IMPLEMENTED_CHARTS = new Set([
    "Visits Over Time",
    "Visits by Facility",
    "Person Type Mix",
    "Top 5 Equipment",
    "Demographic Snapshot",
  ]);

  function handleExportPng(title) {
    const filename = `${title.toLowerCase().replace(/\s+/g, "-")}.png`;
    if (title === "Person Type Mix") {
      exportCategoryMixPng(personTypeMix, filename);
      return;
    }
    if (title === "Demographic Snapshot") {
      exportCategoryMixPng(demographicMix, filename);
      return;
    }
    exportSvgAsPng(chartBodyRefs.current[title], filename);
  }

  function categoryMixCsvRows(segments, labelHeader) {
    const total = segments.reduce((sum, seg) => sum + seg.value, 0);
    return segments.map((seg) => ({
      [labelHeader]: seg.label,
      Count: seg.value,
      Percentage: total ? `${Math.round((seg.value / total) * 100)}%` : "0%",
    }));
  }

  function handleExportCsv(title) {
    const filename = `${title.toLowerCase().replace(/\s+/g, "-")}.csv`;
    if (title === "Visits Over Time") {
      exportRowsAsCsv(visitsOverTime.map((row) => ({ Interval: row.label, Visits: row.visits })), filename);
    } else if (title === "Visits by Facility") {
      exportRowsAsCsv(visitsByFacility.map((row) => ({ Facility: row.facility, Visits: row.visits })), filename);
    } else if (title === "Person Type Mix") {
      exportRowsAsCsv(categoryMixCsvRows(personTypeMix, "Person Type"), filename);
    } else if (title === "Demographic Snapshot") {
      exportRowsAsCsv(categoryMixCsvRows(demographicMix, "Gender"), filename);
    } else if (title === "Top 5 Equipment") {
      exportRowsAsCsv(topEquipment.map((row) => ({ Item: row.item, Checkouts: row.count })), filename);
    }
  }

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
                <div className="chart-card-header">
                  <p className="chart-card-title">{title}</p>
                  <ChartExportMenu
                    disabled={!implemented}
                    onExportPng={() => handleExportPng(title)}
                    onExportCsv={() => handleExportCsv(title)}
                  />
                </div>
                <div
                  className={`chart-card-body ${implemented ? "chart-card-body-chart" : ""}`}
                  ref={(el) => {
                    chartBodyRefs.current[title] = el;
                  }}
                >
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
