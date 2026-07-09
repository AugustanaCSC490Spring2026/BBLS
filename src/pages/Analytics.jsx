import React, { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase"; // TODO: adjust this path to match your actual firebase config file

function Analytics({ gym, updateGym }) {

  const [statData, setStatData] = useState({
    totalVisits: null,
    uniqueVisitors: null,
  });

  useEffect(() => {
    async function fetchStatCardData() {
      let totalVisits = 0;
      const uniqueIds = new Set();

      try {
        for (const name of ["pepsicoCenter", "westerlinGym"]) {
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
  }, []);

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
        <div className="stat-card-row">
          {renderStatCard("TOTAL VISITS", statData.totalVisits, "accent-gold")}
          {renderStatCard("UNIQUE VISITORS", statData.uniqueVisitors, "accent-navy")}

          {/* Reserved space for the other 3 cards from the mockup:
              EQUIP. CHECKED OUT, INVALID SWIPES, PEAK HOUR */}
          <div className="stat-card stat-card-placeholder" />
          <div className="stat-card stat-card-placeholder" />
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
