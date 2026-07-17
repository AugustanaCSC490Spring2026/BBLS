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

const CHECKOUT_COLLECTIONS = {
  Both: ["pepsicoCheckouts", "westerlinCheckouts"],
  PepsiCo: ["pepsicoCheckouts"],
  Westerlin: ["westerlinCheckouts"],
};

const HOUR_LABELS = [
  "12 AM", "1 AM", "2 AM", "3 AM", "4 AM", "5 AM", "6 AM", "7 AM",
  "8 AM", "9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM",
  "4 PM", "5 PM", "6 PM", "7 PM", "8 PM", "9 PM", "10 PM", "11 PM",
];

function Analytics({ gym, updateGym }) {
  // Which facility's data the stat cards (and eventually the charts) reflect.
  const [facility, setFacility] = useState("Both");


  const [statData, setStatData] = useState({
    totalVisits: null,
    uniqueVisitors: null,
    equipmentCheckedOut: null,
    peakHour: null,
  });

  useEffect(() => {
    async function fetchStatCardData() {
      let totalVisits = 0;
      const uniqueIds = new Set();
      const hourCounts = new Array(24).fill(0);

      try {
        for (const name of FACILITY_COLLECTIONS[facility]) {
          const snap = await getDocs(collection(db, name));
          snap.forEach((doc) => {
            const d = doc.data();
            if (!d.swipeInTime) return;
            totalVisits++;
            if (d.ID) uniqueIds.add(d.ID);
            if (d.swipeInTime.toDate) {
              hourCounts[d.swipeInTime.toDate().getHours()]++;
            }
          });
        }
      } catch (err) {
        console.error("Stat card fetch error:", err);
      }

      let equipmentCheckedOut = 0;
      try {
        for (const name of CHECKOUT_COLLECTIONS[facility]) {
          const snap = await getDocs(collection(db, name));
          snap.forEach((doc) => {
            const d = doc.data();
            if (d.returned) return;
            equipmentCheckedOut += d.quantity || 0;
          });
        }
      } catch (err) {
        console.error("Equipment checkout fetch error:", err);
      }

      const peakHourIndex = hourCounts.some((c) => c > 0)
        ? hourCounts.indexOf(Math.max(...hourCounts))
        : null;

      setStatData({
        totalVisits,
        uniqueVisitors: uniqueIds.size,
        equipmentCheckedOut,
        peakHour: peakHourIndex === null ? null : HOUR_LABELS[peakHourIndex],
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
          {renderStatCard("EQUIP. CHECKED OUT", statData.equipmentCheckedOut, "accent-gold")}
          {renderStatCard("PEAK HOUR", statData.peakHour, "accent-navy")}

          {/* Reserved space for the last card from the mockup: INVALID SWIPES */}
          <div className="stat-card stat-card-placeholder" />
        </div>

        {/* Charts (Visits over time, Visits by facility, Person type mix,
            Top 5 equipment, Demographic snapshot) still to come — this is
            where the rest of your original chart JSX will slot back in. */}
      </div>
    </>
  );
}

export default Analytics;
