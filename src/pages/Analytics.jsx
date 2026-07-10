import React, { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../Firebase"; 
import "../components/Analytics.css";

// Maps the facility picker's value to the Firestore collection(s) to query.
// "both" pulls from both gyms and combines the totals.
const FACILITY_COLLECTIONS = {
  both: ["pepsicoCenter", "westerlinGym"],
  pepsico: ["pepsicoCenter"],
  westerlin: ["westerlinGym"],
};

function Analytics({ gym, updateGym }) {
  const [facility, setFacility] = useState("both");


  const [statData, setStatData] = useState({
    totalVisits: null,
    uniqueVisitors: null,
  });

  useEffect(() => {
    async function fetchStatCardData() {
      let totalVisits = 0;
      const uniqueIds = new Set();

      try {
        for (const name of FACILITY_COLLECTIONS[facility]) {
          const snap = await getDocs(collection(db, name));
          snap.forEach((doc) => {
            const d = doc.data();
            if (!d.swipeInTime) return;
            totalVisits++;
            if (d.ID) uniqueIds.add(d.ID);
          });
        }
      } catch (err) {
        console.error("Stat card fetch error:", err);
      }

      setStatData({
        totalVisits,
        uniqueVisitors: uniqueIds.size,
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
          <div className="facility-picker">
            <button
              className={facility === "both" ? "active" : ""}
              onClick={() => setFacility("both")}
            >
              Both
            </button>
            <button
              className={facility === "pepsico" ? "active" : ""}
              onClick={() => setFacility("pepsico")}
            >
              PepsiCo
            </button>
            <button
              className={facility === "westerlin" ? "active" : ""}
              onClick={() => setFacility("westerlin")}
            >
              Westerlin
            </button>
          </div>
        </div>

        <div className="stat-card-row">
          {renderStatCard("TOTAL VISITS", statData.totalVisits, "accent-gold")}
          {renderStatCard("UNIQUE VISITORS", statData.uniqueVisitors, "accent-navy")}

          {/* Reserved space for the other 3 cards from the mockup:
              EQUIP. CHECKED OUT, INVALID SWIPES, PEAK HOUR */}
          <div className="stat-card stat-card-placeholder" />
          <div className="stat-card stat-card-placeholder" />
          <div className="stat-card stat-card-placeholder" />
        </div>

      </div>
    </>
  );
}

export default Analytics;
