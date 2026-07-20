import React, { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
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

  useEffect(() => {
    async function fetchStatCardData() {
      let totalVisits = 0;
      const uniqueIds = new Set();
      const hourCounts = new Array(24).fill(0);
      const dayCounts = new Array(7).fill(0);
      const rangeStart = getRangeStartDate(timeRange);

      try {
        for (const name of FACILITY_COLLECTIONS[facility]) {
          const snap = await getDocs(collection(db, name));
          snap.forEach((doc) => {
            const d = doc.data();
            if (!d.swipeInTime || !d.swipeInTime.toDate) return;
            const visitDate = d.swipeInTime.toDate();
            if (rangeStart && visitDate < rangeStart) return;
            totalVisits++;
            if (d.ID) uniqueIds.add(d.ID);
            hourCounts[visitDate.getHours()]++;
            dayCounts[visitDate.getDay()]++;
          });
        }
      } catch (err) {
        console.error("Stat card fetch error:", err);
      }

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
    }

    fetchStatCardData();
  }, [facility, timeRange]);

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
          {[
            "Visits Over Time",
            "Visits by Facility",
            "Person Type Mix",
            "Top 5 Equipment",
            "Demographic Snapshot",
          ].map((title) => (
            <div className="chart-card chart-card-placeholder" key={title}>
              <p className="chart-card-title">{title}</p>
              <div className="chart-card-body">Chart coming soon</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default Analytics;
