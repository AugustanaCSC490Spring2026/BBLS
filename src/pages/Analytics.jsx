// This entire file was generated with help from ChatGPT 
import React, { useState, useEffect } from "react";
import { Bar, Pie } from "react-chartjs-2"; // ✅ NEW: Added Pie chart
import Navbar from "./Navigation.jsx";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement, // ✅ NEW: Needed for pie chart
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

// JSON test datasets
import midnightEdge from "./test-data/midnight-edge.json";
import leapYear from "./test-data/leap-year.json";
import duplicates from "./test-data/duplicates.json";
import future from "./test-data/future.json";
import invalid from "./test-data/invalid.json";
import timezone from "./test-data/timezone.json";
import empty from "./test-data/empty.json";

// Firebase imports
import { db } from "../Firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

function Analytics() {

  // ✅ NEW: Chart type state (Swipe-ins vs Demographics)
  const [chartType, setChartType] = useState("swipe");

  const [timeRange, setTimeRange] = useState("today");
  const [interval, setInterval] = useState("hours");

  // ✅ NEW: Demographic type dropdown state
  const [demographicType, setDemographicType] = useState("Class");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [chartData, setChartData] = useState([]);
  const [swipeData, setSwipeData] = useState([]);

  // ✅ NEW: Stores aggregated demographic counts
  const [demographicData, setDemographicData] = useState({});

  // ✅ NEW: Cached student data (FULL FETCH)
  const [studentMap, setStudentMap] = useState({});

  const [dataFile, setDataFile] = useState("normal");

  const [normalData, setNormalData] = useState([]);

  // ✅ NEW: Maps dropdown names to Firestore field names
  const demographicFieldMap = {
    Class: "Class",
    Gender: "Gender",
    "International/Domestic": "International",
    PersonType: "PersonType",
    Race: "Race",
    Residence: "Residence",
    Transfer: "Transfer"
  };

  // ✅ NEW: Fetch entire currentStudents collection ONCE and cache it
  useEffect(() => {
    async function loadStudents() {
      try {
        const snapshot = await getDocs(collection(db, "currentStudents"));
        const map = {};

        snapshot.forEach(doc => {
          const data = doc.data();
          map[data.ID] = data;
        });

        setStudentMap(map);
      } catch (err) {
        console.error("Error loading students:", err);
      }
    }

    loadStudents();
  }, []);

  function generateNormalDataset() {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 12);
    const endDate = new Date();

    const data = [];

    function randomStudent() {
      return Math.floor(10000 + Math.random() * 90000);
    }

    function getHoursForDay(day) {
      switch (day) {
        case 0: return [10, 22];
        case 1:
        case 2:
        case 3:
        case 4: return [7, 22];
        case 5: return [7, 20];
        case 6: return [9, 18];
        default: return [7, 22];
      }
    }

    let cursor = new Date(startDate);

    while (cursor <= endDate) {
      const day = cursor.getDay();
      const [open, close] = getHoursForDay(day);
      const swipes = Math.floor(Math.random() * 40) + 20;

      for (let i = 0; i < swipes; i++) {
        const hour = Math.floor(Math.random() * (close - open)) + open;

        const d = new Date(cursor);
        d.setHours(hour);
        d.setMinutes(Math.floor(Math.random() * 60));
        d.setSeconds(Math.floor(Math.random() * 60));

        data.push({
          studentId: randomStudent(),
          time: d.toISOString().slice(0, 19)
        });
      }

      cursor.setDate(cursor.getDate() + 1);
    }

    return data;
  }

  const datasets = {
    normal: generateNormalDataset,
    midnightEdge,
    leapYear,
    duplicates,
    future,
    invalid,
    timezone,
    empty
  };

  useEffect(() => {
    setNormalData(generateNormalDataset());
  }, []);

  useEffect(() => {
    async function loadData() {

      if (dataFile === "pepsico") {
        await fetchSpecificCollection("pepsicoCenter");
      }
      else if (dataFile === "westerlin") {
        await fetchSpecificCollection("westerlinGym");
      }
      else if (dataFile === "combined") {
        await fetchCombinedCollections();
      }
      else if (dataFile === "firebase") {
        await fetchFirebaseData();
      }
      else if (dataFile === "guestEntrance") {
        await fetchGuestEntrance();
      }
      else if (dataFile === "normal") {
        setSwipeData(normalData);
      }
      else {
        setSwipeData(datasets[dataFile] || []);
      }

    }

    loadData();
  }, [dataFile, timeRange, startDate, endDate, normalData]);

  function getDateRange() {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (timeRange) {
      case "today":
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case "yesterday":
        start.setDate(now.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end.setDate(now.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        break;
      case "week":
        start.setDate(now.getDate() - now.getDay());
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case "month":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case "year":
        start = new Date(now.getFullYear(), 0, 1);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case "custom":
        if (startDate) {
          const [y, m, d] = startDate.split("-");
          start = new Date(y, m - 1, d);
          start.setHours(0, 0, 0, 0);
        }
        if (endDate) {
          const [y2, m2, d2] = endDate.split("-");
          end = new Date(y2, m2 - 1, d2);
          end.setHours(23, 59, 59, 999);
        }
        break;
      default:
        break;
    }

    return { start, end };
  }

  async function fetchSpecificCollection(collectionName) {
    const { start, end } = getDateRange();
    const ref = collection(db, collectionName);

    const q = query(
      ref,
      where("swipeInTime", ">=", start),
      where("swipeInTime", "<=", end)
    );

    const snapshot = await getDocs(q);
    const data = [];

    snapshot.forEach((doc) => {
      const d = doc.data();
      if (!d.swipeInTime) return;

      data.push({
        studentId: d.ID,
        time: d.swipeInTime.toDate()
      });
    });

    setSwipeData(data);
  }

  async function fetchCombinedCollections() {
    const { start, end } = getDateRange();
    const collections = ["pepsicoCenter", "westerlinGym"];

    let combined = [];

    for (let name of collections) {
      const ref = collection(db, name);

      const q = query(
        ref,
        where("swipeInTime", ">=", start),
        where("swipeInTime", "<=", end)
      );

      const snapshot = await getDocs(q);

      snapshot.forEach((doc) => {
        const d = doc.data();
        if (!d.swipeInTime) return;

        combined.push({
          studentId: d.ID,
          time: d.swipeInTime.toDate()
        });
      });
    }

    setSwipeData(combined);
  }

  async function fetchFirebaseData() {
    const { start, end } = getDateRange();
    const swipeRef = collection(db, "swipeIns");

    const q = query(
      swipeRef,
      where("swipeInTime", ">=", start),
      where("swipeInTime", "<=", end)
    );

    const snapshot = await getDocs(q);
    const data = [];

    snapshot.forEach((doc) => {
      const d = doc.data();
      if (!d.swipeInTime) return;

      data.push({
        studentId: d.ID,
        time: d.swipeInTime.toDate()
      });
    });

    setSwipeData(data);
  }

  async function fetchGuestEntrance() {
    const { start, end } = getDateRange();
    const ref = collection(db, "guestEntrance");

    const q = query(
      ref,
      where("timestamp", ">=", start),
      where("timestamp", "<=", end)
    );

    const snapshot = await getDocs(q);
    const data = [];

    snapshot.forEach((doc) => {
      const d = doc.data();
      if (!d.timestamp) return;

      data.push({
        studentId: "guest",
        time: d.timestamp.toDate()
      });
    });

    setSwipeData(data);
  }

  // ✅ NEW: Process demographics using cached studentMap (NO DB CALLS)
  function processDemographics() {
    const { start, end } = getDateRange();
    const counts = {};

    swipeData.forEach((swipe) => {
      if (swipe.studentId === "guest") return;

      const date = swipe.time instanceof Date ? swipe.time : new Date(swipe.time);
      if (isNaN(date) || date < start || date > end) return;

      const student = studentMap[swipe.studentId];

      const fieldName = demographicFieldMap[demographicType];
      let value = student?.[fieldName];

      if (!value || value.trim() === "") value = "N/A";

      counts[value] = (counts[value] || 0) + 1;
    });

    setDemographicData(counts);
  }

  // ✅ NEW: Run demographic processing when needed
  useEffect(() => {
    if (chartType === "demographics" && Object.keys(studentMap).length > 0) {
      processDemographics();
    }
  }, [chartType, demographicType, swipeData, timeRange, startDate, endDate, studentMap]);

  function generateIntervals(start, end) {
    let buckets = {};
    const cursor = new Date(start);

    if (interval === "hours") cursor.setMinutes(0, 0, 0);
    else if (interval === "days") cursor.setHours(0, 0, 0, 0);
    else if (interval === "weeks") {
      cursor.setDate(cursor.getDate() - cursor.getDay());
      cursor.setHours(0, 0, 0, 0);
    }
    else if (interval === "months") {
      cursor.setDate(1);
      cursor.setHours(0, 0, 0, 0);
    }
    else if (interval === "years") {
      cursor.setMonth(0, 1);
      cursor.setHours(0, 0, 0, 0);
    }

    while (cursor <= end) {
      let label = "";

      if (interval === "hours") {
        label = `${cursor.getMonth() + 1}/${cursor.getDate()}/${cursor.getFullYear()} ${cursor.getHours()}:00`;
        cursor.setHours(cursor.getHours() + 1);
      }
      else if (interval === "days") {
        label = `${cursor.getMonth() + 1}/${cursor.getDate()}/${cursor.getFullYear()}`;
        cursor.setDate(cursor.getDate() + 1);
      }
      else if (interval === "weeks") {
        label = `${cursor.getMonth() + 1}/${cursor.getDate()}/${cursor.getFullYear()}`;
        cursor.setDate(cursor.getDate() + 7);
      }
      else if (interval === "months") {
        label = `${cursor.getMonth() + 1}/${cursor.getFullYear()}`;
        cursor.setMonth(cursor.getMonth() + 1);
      }
      else if (interval === "years") {
        label = `${cursor.getFullYear()}`;
        cursor.setFullYear(cursor.getFullYear() + 1);
      }

      buckets[label] = 0;
    }

    return buckets;
  }

  function processData() {
    const { start, end } = getDateRange();
    const buckets = generateIntervals(start, end);

    swipeData.forEach((swipe) => {
      const date = swipe.time instanceof Date ? swipe.time : new Date(swipe.time);

      if (isNaN(date)) return;
      if (date < start || date > end) return;

      let label = "";

      if (interval === "hours")
        label = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()} ${date.getHours()}:00`;
      else if (interval === "days")
        label = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
      else if (interval === "weeks") {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        weekStart.setHours(0, 0, 0, 0);
        label = `${weekStart.getMonth() + 1}/${weekStart.getDate()}/${weekStart.getFullYear()}`;
      }
      else if (interval === "months")
        label = `${date.getMonth() + 1}/${date.getFullYear()}`;
      else if (interval === "years")
        label = `${date.getFullYear()}`;

      if (buckets[label] !== undefined) buckets[label] += 1;
    });

    const formatted = Object.keys(buckets).map((key) => ({
      interval: key,
      swipes: buckets[key]
    }));

    setChartData(formatted);
  }

  useEffect(() => {
    processData();
  }, [timeRange, interval, startDate, endDate, swipeData]);

  const data = {
    labels: chartData.map((d) => d.interval),
    datasets: [
      {
        label: "Swipes",
        data: chartData.map((d) => d.swipes),
        backgroundColor: "#8884d8"
      }
    ]
  };

  // ✅ NEW: Pie chart dataset
  const pieData = {
    labels: Object.keys(demographicData),
    datasets: [
      {
        data: Object.values(demographicData),
        backgroundColor: [
          "#8884d8",
          "#82ca9d",
          "#ffc658",
          "#ff7f7f",
          "#8dd1e1",
          "#d0ed57",
          "#a4de6c"
        ]
      }
    ]
  };

  return (
    <div>
      <Navbar />
      <div style={{ padding: "20px" }}>

        {/* ✅ NEW: Chart Type Dropdown */}
        <h3>Chart Type</h3>
        <select value={chartType} onChange={(e) => setChartType(e.target.value)}>
          <option value="swipe">Swipe-ins</option>
          <option value="demographics">Demographics</option>
        </select>

        <h1>Analytics Page</h1>

        <h3>Test Dataset</h3>
        <select value={dataFile} onChange={(e) => setDataFile(e.target.value)}>
          <option value="normal">Normal (generated thousands)</option>
          <option value="midnightEdge">Midnight Edge</option>
          <option value="leapYear">Leap Year</option>
          <option value="duplicates">Duplicates</option>
          <option value="future">Future Dates</option>
          <option value="invalid">Invalid Data</option>
          <option value="timezone">Timezone</option>
          <option value="empty">Empty</option>
          <option value="firebase">Firebase Data</option>
          <option value="pepsico">PepsiCo Center (Firebase)</option>
          <option value="westerlin">Westerlin Gym (Firebase)</option>
          <option value="combined">Combined Gyms (Firebase)</option>

          {/* ✅ NEW: Hide guest option when demographics is selected */}
          {chartType !== "demographics" && (
            <option value="guestEntrance">Guest Entrance (Firebase)</option>
          )}
        </select>

        <h3>Choose Time Range</h3>
        <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
          <option value="custom">Date Range</option>
        </select>

        {timeRange === "custom" && (
          <div>
            <input type="date" onChange={(e) => setStartDate(e.target.value)} />
            <input type="date" onChange={(e) => setEndDate(e.target.value)} />
          </div>
        )}

        {/* ✅ NEW: Conditional UI */}
        {chartType === "swipe" ? (
          <>
            <h3>Interval</h3>
            <select value={interval} onChange={(e) => setInterval(e.target.value)}>
              <option value="hours">Hours</option>
              <option value="days">Days</option>
              <option value="weeks">Weeks</option>
              <option value="months">Months</option>
              <option value="years">Years</option>
            </select>
          </>
        ) : (
          <>
            <h3>Demographic Type</h3>
            <select value={demographicType} onChange={(e) => setDemographicType(e.target.value)}>
              <option value="Class">Class</option>
              <option value="Gender">Gender</option>
              <option value="International/Domestic">International/Domestic</option>
              <option value="PersonType">PersonType</option>
              <option value="Race">Race</option>
              <option value="Residence">Residence</option>
              <option value="Transfer">Transfer</option>
            </select>
          </>
        )}

        <div style={{ width: "100%", height: 400, marginTop: 40 }}>
          {chartType === "swipe" ? (
            <Bar data={data} />
          ) : (
            <Pie data={pieData} />
          )}
        </div>
      </div>
    </div>
  );
}

export default Analytics;