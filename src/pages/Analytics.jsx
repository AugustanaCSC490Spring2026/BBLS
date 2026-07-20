import React, { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../Firebase"; 
import "../components/Analytics.css";
import NavDropdown from "../components/NavDropdownAnalytics.jsx"; 

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

function Analytics({ gym, updateGym }) {
  // Which facility's data the stat cards (and eventually the charts) reflect.
  const [facility, setFacility] = useState("Both");


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

      try {
        for (const name of FACILITY_COLLECTIONS[facility]) {
          const snap = await getDocs(collection(db, name));
          snap.forEach((doc) => {
            const d = doc.data();
            if (!d.swipeInTime) return;
            totalVisits++;
            if (d.ID) uniqueIds.add(d.ID);
            if (d.swipeInTime.toDate) {
              const visitDate = d.swipeInTime.toDate();
              hourCounts[visitDate.getHours()]++;
              dayCounts[visitDate.getDay()]++;
            }
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
  }, [facility]);

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

        {/* Charts (Visits over time, Visits by facility, Person type mix,
            Top 5 equipment, Demographic snapshot) still to come — this is
            where the rest of your original chart JSX will slot back in. */}
      </div>
    </>
  );
}

export default Analytics;
