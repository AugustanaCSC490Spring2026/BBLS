import React, { useState, useEffect, useRef } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import Papa from "papaparse";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
} from "recharts";
import { app } from "../Firebase";
import "../components/Analytics.css";
import NavDropdown from "../components/NavDropdownAnalytics.jsx";
import TimeRangeFilter from "../components/TimeRangeFilter.jsx";
import ChartExportMenu from "../components/ChartExportMenu.jsx";

// Augustana brand navy/gold. Every multi-bar/segment chart on this page
// alternates strictly between these two instead of a categorical hue ramp.
const BRAND_CHART_COLORS = ["#002F6C", "#FFC72C"];

const DEMOGRAPHIC_DIMENSIONS = ["Class", "Transfer Status", "Residence Hall", "International"];

const analyticsSummary = httpsCallable(getFunctions(app, "us-central1"), "analyticsSummary");

const withColors = (segments) =>
  segments.map((seg, i) => ({ ...seg, color: BRAND_CHART_COLORS[i % BRAND_CHART_COLORS.length] }));

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

// A category mix (Person Type Mix) has an HTML legend alongside its SVG bar,
// so it's drawn straight from the underlying data instead of rasterizing the DOM.
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

// Demographics has an HTML legend beside its SVG pie, so — like the category
// mix bars — it's drawn straight from the underlying data for export.
function exportPieChartPng(segments, filename) {
  const total = segments.reduce((sum, seg) => sum + seg.value, 0);
  if (!total) return;

  const scale = 2;
  const width = 640;
  const padding = 24;
  const pieSize = 200;
  const rowHeight = 24;
  const height = Math.max(pieSize + padding * 2, padding * 2 + segments.length * rowHeight);

  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  const cx = padding + pieSize / 2;
  const cy = height / 2;
  const radius = pieSize / 2;
  let startAngle = -Math.PI / 2;
  segments.forEach((seg) => {
    const sliceAngle = (seg.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = seg.color;
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();
    startAngle += sliceAngle;
  });

  ctx.font = "13px system-ui, -apple-system, sans-serif";
  ctx.textBaseline = "middle";
  const legendX = padding + pieSize + 32;
  let legendY = height / 2 - (segments.length * rowHeight) / 2 + rowHeight / 2;
  segments.forEach((seg) => {
    ctx.fillStyle = seg.color;
    ctx.fillRect(legendX, legendY - 5, 10, 10);
    ctx.fillStyle = "#444444";
    const pct = Math.round((seg.value / total) * 100);
    ctx.fillText(`${seg.label} — ${pct}%`, legendX + 18, legendY);
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
  const [demographicsData, setDemographicsData] = useState({});
  const [demographicDimension, setDemographicDimension] = useState("Class");
  const [topEquipment, setTopEquipment] = useState([]);

  const chartBodyRefs = useRef({});

  useEffect(() => {
    let cancelled = false;
    analyticsSummary({ facility, timeRange, timeInterval })
      .then(({ data }) => {
        if (cancelled) return;
        setStatData(data.stats);
        setVisitsOverTime(data.visitsOverTime);
        setVisitsByFacility(data.visitsByFacility);
        setPersonTypeMix(withColors(data.personTypeMix));
        setDemographicsData(
          Object.fromEntries(Object.entries(data.demographics).map(([dim, segs]) => [dim, withColors(segs)]))
        );
        setTopEquipment(data.topEquipment);
      })
      .catch((err) => console.error("Analytics fetch error:", err.code || err.message));
    return () => {
      cancelled = true;
    };
  }, [facility, timeRange, timeInterval]);

  const CHART_TITLES = [
    "Visits Over Time",
    "Visits by Facility",
    "Person Type Mix",
    "Top 5 Equipment",
    "Demographics",
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
            <Bar dataKey="visits" radius={[4, 4, 0, 0]} maxBarSize={64}>
              {visitsByFacility.map((entry, i) => (
                <Cell key={entry.facility} fill={BRAND_CHART_COLORS[i % BRAND_CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (title === "Person Type Mix") {
      if (!personTypeMix.length) return <span>No visit data for this range</span>;
      return renderCategoryMixChart(personTypeMix);
    }

    if (title === "Demographics") {
      const segments = demographicsData[demographicDimension] || [];
      if (!segments.length) return <span>No roster data for this range</span>;
      const total = segments.reduce((sum, seg) => sum + seg.value, 0);

      return (
        <div className="demographics-chart">
          <div className="demographics-pie">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={segments}
                  dataKey="value"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius="45%"
                  outerRadius="85%"
                  paddingAngle={2}
                  stroke="#fff"
                  strokeWidth={2}
                >
                  {segments.map((seg) => (
                    <Cell key={seg.label} fill={seg.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e2e2" }}
                  formatter={(value, name) => [`${value.toLocaleString()} (${Math.round((value / total) * 100)}%)`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="demographics-legend">
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
            <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={20}>
              <LabelList dataKey="count" position="right" style={{ fontSize: 11, fill: "#666" }} />
              {topEquipment.map((entry, i) => (
                <Cell key={entry.item} fill={BRAND_CHART_COLORS[i % BRAND_CHART_COLORS.length]} />
              ))}
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
    "Demographics",
  ]);

  function handleExportPng(title) {
    const filename = `${title.toLowerCase().replace(/\s+/g, "-")}.png`;
    if (title === "Person Type Mix") {
      exportCategoryMixPng(personTypeMix, filename);
      return;
    }
    if (title === "Demographics") {
      const dimensionSlug = demographicDimension.toLowerCase().replace(/\s+/g, "-");
      exportPieChartPng(demographicsData[demographicDimension] || [], `demographics-${dimensionSlug}.png`);
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
    } else if (title === "Demographics") {
      const dimensionSlug = demographicDimension.toLowerCase().replace(/\s+/g, "-");
      exportRowsAsCsv(
        categoryMixCsvRows(demographicsData[demographicDimension] || [], demographicDimension),
        `demographics-${dimensionSlug}.csv`
      );
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
                  <div className="chart-card-header-left">
                    <p className="chart-card-title">{title}</p>
                    {title === "Demographics" && (
                      <select
                        className="chart-card-select"
                        value={demographicDimension}
                        onChange={(e) => setDemographicDimension(e.target.value)}
                      >
                        {DEMOGRAPHIC_DIMENSIONS.map((dim) => (
                          <option key={dim} value={dim}>{dim}</option>
                        ))}
                      </select>
                    )}
                  </div>
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
