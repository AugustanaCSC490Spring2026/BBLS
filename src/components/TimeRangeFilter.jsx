import React from "react";
import "./TimeRangeFilter.css";

const INTERVAL_OPTIONS = ["Hourly", "Daily", "Weekly", "Monthly"];
const RANGE_OPTIONS = ["Last 7 Days", "Last 30 Days", "Last 90 Days", "This Year", "All Time"];

export default function TimeRangeFilter({ interval, range, onIntervalChange, onRangeChange }) {
  return (
    <div className="time-filter-box">
      <div className="time-filter-field">
        <label htmlFor="time-interval-select">Interval</label>
        <select
          id="time-interval-select"
          value={interval}
          onChange={(e) => onIntervalChange(e.target.value)}
        >
          {INTERVAL_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <div className="time-filter-divider" />

      <div className="time-filter-field">
        <label htmlFor="time-range-select">Range</label>
        <select
          id="time-range-select"
          value={range}
          onChange={(e) => onRangeChange(e.target.value)}
        >
          {RANGE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
