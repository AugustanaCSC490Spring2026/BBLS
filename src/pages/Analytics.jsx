// This entire file was generated with help from ChatGPT and Gemini
// import React, { useState, useEffect, useRef } from "react";
// import { Bar, Pie, Line, Radar, Doughnut } from "react-chartjs-2"; 
// import "../components/Analytics.css";
// import {
//   Chart as ChartJS,
//   CategoryScale,
//   LinearScale,
//   RadialLinearScale, // Required for radar mapping
//   BarElement,
//   ArcElement, // Needed for pie and doughnut charts
//   Tooltip,
//   Legend,
//   LineElement,
//   PointElement
// } from "chart.js";

// ChartJS.register(CategoryScale, LinearScale, RadialLinearScale, BarElement, ArcElement, Tooltip, Legend, LineElement, PointElement);


// Firebase imports
// import { db } from "../Firebase";
// import { collection, query, where, getDocs, getCountFromServer } from "firebase/firestore";

import React from "react";

function Analytics({ gym, updateGym }) {

  /*
  ORIGINAL IMPLEMENTATION - commented out to render a blank page

  // Chart type state updated to visual variants (Bar vs Pie vs Line vs Radar vs Doughnut) for easy scaling
  const [chartType, setChartType] = useState("bar");

  const [timeRange, setTimeRange] = useState("today");
  const [interval, setInterval] = useState("hours");

  // Demographic type dropdown state
  const [demographicType, setDemographicType] = useState("Class");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [chartData, setChartData] = useState([]);
  const [swipeData, setSwipeData] = useState([]);

  // Stores aggregated demographic counts
  const [demographicData, setDemographicData] = useState({});
  
  // 🆕 Stores non-demographic categorical data (Equipment types, Guest categories, or Swipe locations)
  const [categoricalData, setCategoricalData] = useState({});

  // Cached student data (FULL FETCH)
  const [studentMap, setStudentMap] = useState({});

  const [dataFile, setDataFile] = useState("combined");

  // Export dropdown state
  const [exportFormat, setExportFormat] = useState("");

  // State to handle weekly/monthly/daily grouping
  const [groupBy, setGroupBy] = useState("none");

  // Stat card data
  const [statData, setStatData] = useState({
    thisWeekSwipes: null, lastWeekSwipes: null,
    thisWeekCheckouts: null, lastWeekCheckouts: null,
    thisWeekUnique: null, lastWeekUnique: null,
  });

  const chartRef = useRef(null);

  // Maps dropdown names that match to Firestore field names
  const demographicFieldMap = {
    Class: "Class",
    Gender: "Gender",
    "International/Domestic": "International",
    PersonType: "PersonType",
    Race: "Race",
    Residence: "Residence",
    Transfer: "Transfer"
  };

  // Simple way to check if a dataset is an equipment checkout. Used to sort
  // equipment data out when showing different equipments on graph
  const isCheckoutDataset =
    dataFile === "pepsicoCheckouts" ||
    dataFile === "westerlinCheckouts" ||
    dataFile === "combinedCheckouts";

  // Shared color palette used across different pie and doughnut distributions
  const colorPalette = [
    "#8dd1e1",
    "#82ca9d",
    "#8884d8",
    "#ff7f7f",
    "#ffc658",
    "#d0ed57",
    "#a4de6c",
    "#a78bfa",
    "#fb7185",
    "#34d399"
  ];

  // Gives categories for guest swipes different colors on the graph. Color codes the guest swipes
  const categoryColorMap = {};
  function getCategoryColor(category) {
    if (categoryColorMap[category]) return categoryColorMap[category];
    const index = Object.keys(categoryColorMap).length % colorPalette.length;
    categoryColorMap[category] = colorPalette[index];
    return categoryColorMap[category];
  }

  // Fetch this week vs last week stats for the stat cards
  useEffect(() => {
    async function fetchStatCardData() {
      const now = new Date();

      const thisWeekStart = new Date(now);
      thisWeekStart.setDate(now.getDate() - now.getDay());
      thisWeekStart.setHours(0, 0, 0, 0);

      const lastWeekStart = new Date(thisWeekStart);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);

      let twSwipes = 0, lwSwipes = 0, twCheckouts = 0, lwCheckouts = 0;
      const twUnique = new Set(), lwUnique = new Set();

      try {
        for (const name of ["pepsicoCenter", "westerlinGym"]) {
          const q = query(collection(db, name), where("swipeInTime", ">=", lastWeekStart), where("swipeInTime", "<=", now));
          const snap = await getDocs(q);
          snap.forEach(doc => {
            const d = doc.data();
            if (!d.swipeInTime) return;
            const t = d.swipeInTime.toDate();
            if (t >= thisWeekStart) { twSwipes++; if (d.ID) twUnique.add(d.ID); }
            else { lwSwipes++; if (d.ID) lwUnique.add(d.ID); }
          });
        }
        for (const name of ["pepsicoCheckouts", "westerlinCheckouts"]) {
          const q = query(collection(db, name), where("checkoutTime", ">=", lastWeekStart), where("checkoutTime", "<=", now));
          const snap = await getDocs(q);
          snap.forEach(doc => {
            const d = doc.data();
            if (!d.checkoutTime) return;
            const t = d.checkoutTime.toDate();
            
            // FIXED: Incrementing by the actual quantity value instead of 1
            const itemQuantity = Number(d.quantity) || 1;
            if (t >= thisWeekStart) {
              twCheckouts += itemQuantity;
            } else {
              lwCheckouts += itemQuantity;
            }
          });
        }
      } catch (err) {
        console.error("Stat card fetch error:", err);
      }

      setStatData({
        thisWeekSwipes: twSwipes, lastWeekSwipes: lwSwipes,
        thisWeekCheckouts: twCheckouts, lastWeekCheckouts: lwCheckouts,
        thisWeekUnique: twUnique.size, lastWeekUnique: lwUnique.size,
      });
    }
    fetchStatCardData();
  }, []);

  // Cached student data with 24-hour LocalStorage fallback. Basically, stores a version of currentStudents locally every 24 hours. Prevents excessive firebae reads.
  useEffect(() => {
    async function loadStudents() {
      try {
        const CACHE_KEY = "cached_student_map";
        const CACHE_TIMESTAMP_KEY = "cached_student_map_timestamp";
        const ONE_DAY_MS = 24 * 60 * 60 * 1000; // 24 hours

        const cachedData = localStorage.getItem(CACHE_KEY);
        const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
        const now = Date.now();

        // Check if valid cache exists and is less than 24 hours old
        if (cachedData && cachedTimestamp && (now - Number(cachedTimestamp) < ONE_DAY_MS)) {
          setStudentMap(JSON.parse(cachedData));
          return; // Exit function early, bypassing Firestore reads entirely!
        }

        // Fallback to Firestore if cache is missing or expired
        const snapshot = await getDocs(collection(db, "currentStudents"));
        const map = {};

        snapshot.forEach(doc => {
          const data = doc.data();
          map[data.ID] = data;
        });

        // Save fresh data and current time to localStorage
        localStorage.setItem(CACHE_KEY, JSON.stringify(map));
        localStorage.setItem(CACHE_TIMESTAMP_KEY, now.toString());
        
        setStudentMap(map);
      } catch (err) {
        console.error("Error loading students:", err);
      }
    }

    loadStudents();
  }, []);

  // Automatically force interval to "days" if the selected range is longer than a week
  useEffect(() => {
    const { start, end } = getDateRange();
    const diffDays = (end - start) / (1000 * 60 * 60 * 24);
    
    if (diffDays > 7 && interval === "hours") {
      setInterval("days");
    }
  }, [timeRange, startDate, endDate, interval]);

  // Key useEffect that reloads charts anytime an attribute of the chart changes (one of the drop-downs). This one leads to swipeData being generated (based off a given collection, gets swipes for that range)
  useEffect(() => {
    async function loadData() {

      if (dataFile === "pepsico") {
        await fetchSpecificCollection("pepsicoCenter", "PepsiCo Center");
      }
      else if (dataFile === "westerlin") {
        await fetchSpecificCollection("westerlinGym", "Westerlin Gym");
      }
      else if (dataFile === "combined" || dataFile === "demographics") {
        await fetchCombinedCollections();
      }
      else if (dataFile === "pepsicoCheckouts") {
        await fetchCheckoutCollection("pepsicoCheckouts");
      }
      else if (dataFile === "westerlinCheckouts") {
        await fetchCheckoutCollection("westerlinCheckouts");
      }
      else if (dataFile === "combinedCheckouts") {
        await fetchCombinedCheckouts();
      }
      else if (dataFile === "guestEntrance") {
        await fetchGuestEntrance();
      }
      else {
        setSwipeData(datasets[dataFile] || []);
      }

    }

    loadData();
  }, [dataFile, timeRange, startDate, endDate]);

  // Based on the given time range chosen by a user, this function selects the start/end times
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

  // Generates the file name when exporting so it includes the file type and date
  function generateExportFileName(extension) {
    const now = new Date();

    const pad = (n) => String(n).padStart(2, "0");

    const timestamp =
      `${now.getFullYear()}-` +
      `${pad(now.getMonth() + 1)}-` +
      `${pad(now.getDate())}_` +
      `${pad(now.getHours())}-` +
      `${pad(now.getMinutes())}-` +
      `${pad(now.getSeconds())}`;

    let baseName = "";

    if (chartType === "pie" || chartType === "doughnut" || dataFile === "demographics") {
      baseName = "distribution_data";
    }
    else if (isCheckoutDataset) {
      baseName = "equipment_data";
    }
    else {
      baseName = "swipe_data";
    }

    return `${baseName}_${timestamp}.${extension}`;
  }

  // PNG Export
  function exportChartToPNG() {
    let chartInstance = chartRef.current;

    if (chartInstance?.chart) {
      chartInstance = chartInstance.chart;
    }

    if (!chartInstance || !chartInstance.toBase64Image) {
      console.error("Chart instance not ready for export");
      return;
    }

    const url = chartInstance.toBase64Image("image/png", 1);

    const link = document.createElement("a");
    link.href = url;
    link.download = generateExportFileName("png");

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // CSV EXPORT 
  function exportSwipeDataToCSV() {
    // Custom formatted CSV print for aggregated demographic summaries
    if (dataFile === "demographics") {
      const rows = [["Demographic Variant", "Total Count"]];
      Object.entries(demographicData).forEach(([key, value]) => {
        rows.push([key, value]);
      });
      const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", generateExportFileName("csv"));
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // Custom CSV output for other categorical charts (Equipment popularity, Location swipes, Guest types)
    if (chartType === "pie" || chartType === "doughnut") {
      const rows = [["Category / Metric", "Total Distribution Count"]];
      Object.entries(categoricalData).forEach(([key, value]) => {
        rows.push([key, value]);
      });
      const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", generateExportFileName("csv"));
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    const { start, end } = getDateRange();

    const filtered = swipeData
      .filter((swipe) => {
        const date =
          swipe.time instanceof Date ? swipe.time : new Date(swipe.time);

        return !isNaN(date) && date >= start && date <= end;
      })
      .sort((a, b) => {
        const aDate = new Date(a.time);
        const bDate = new Date(b.time);
        return aDate - bDate;
      });

    const pad = (n) => String(n).padStart(2, "0");

    const timeColumnLabel = isCheckoutDataset ? "Checkout Time" : "Swipe Time";

    // Build unique headers dynamically determined by dataset (No Student ID columns)
    let headers = [];
    if (isCheckoutDataset) {
      headers = ["Email", "Equipment", "Quantity", timeColumnLabel]; // FIXED: Added Quantity to headers
    } else if (dataFile === "guestEntrance") {
      headers = ["Name", "Guest Type", timeColumnLabel];
    } else {
      headers = ["Email", "Location", timeColumnLabel];
    }

    // Append standard tracking header dynamically if grouping is active
    if (groupBy !== "none") {
      let groupHeader = "Group Value";
      if (groupBy === "dayOfWeek") groupHeader = "Day of Week";
      else if (groupBy === "hourOfDay") groupHeader = "Hour of Day";
      else if (groupBy === "dayOfMonth") groupHeader = "Day of Month";
      else if (groupBy === "monthOfYear") groupHeader = "Month of Year";
      headers.push(groupHeader);
    }

    const rows = [headers];

    filtered.forEach((swipe) => {
      const date =
        swipe.time instanceof Date ? swipe.time : new Date(swipe.time);

      const localTime =
        `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
        `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;

      let rowData = [];

      // Structure rows according to your rules (omitting Student ID)
      if (isCheckoutDataset) {
        const student = studentMap[swipe.studentId];
        const email = student?.Email || "";
        rowData = [email, swipe.equipment || "Unknown", swipe.quantity || 1, localTime]; // FIXED: Added quantity value
      } else if (dataFile === "guestEntrance") {
        rowData = [swipe.name || "", swipe.category || "N/A", localTime];
      } else {
        const student = studentMap[swipe.studentId];
        const email = student?.Email || "";
        rowData = [email, swipe.location || "N/A", localTime];
      }

      // Compute context tracking cell values dynamically if grouped
      if (groupBy !== "none") {
        let groupValue = "";
        if (groupBy === "dayOfWeek") {
          const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
          groupValue = days[date.getDay()];
        } else if (groupBy === "hourOfDay") {
          groupValue = `${date.getHours()}:00`;
        } else if (groupBy === "dayOfMonth") {
          groupValue = `${date.getDate()}`;
        } else if (groupBy === "monthOfYear") {
          const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
          groupValue = months[date.getMonth()];
        }
        rowData.push(groupValue);
      }

      rows.push(rowData);
    });

    // Wrapped in double-quotes to preserve syntax integrity if data values have internal commas
    const csvContent =
      "data:text/csv;charset=utf-8," +
      rows.map((row) => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");

    link.setAttribute("href", encodedUri);
    link.setAttribute("download", generateExportFileName("csv"));

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Fetches the given collection from firestore
  async function fetchSpecificCollection(collectionName, visibleLocationName) {
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
        time: d.swipeInTime.toDate(),
        location: visibleLocationName // 🆕 Map specific location string for single datasets
      });
    });

    setSwipeData(data);
  }

  // Fetches specifically pepsico and westerlin
  async function fetchCombinedCollections() {
    const { start, end } = getDateRange();
    let combined = [];

    // Map specific readable facility names
    const targetCollections = [
      { id: "pepsicoCenter", label: "PepsiCo Center" },
      { id: "westerlinGym", label: "Westerlin Gym" }
    ];

    for (let col of targetCollections) {
      const ref = collection(db, col.id);

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
          time: d.swipeInTime.toDate(),
          location: col.label // 🆕 Attach label for accurate visual composition breakdowns
        });
      });
    }

    setSwipeData(combined);
  }

  // Fetches checkout data based off a specific location. Similar to fetchSpecificCollection()
  async function fetchCheckoutCollection(collectionName) {
    const { start, end } = getDateRange();
    const ref = collection(db, collectionName);

    const q = query(
      ref,
      where("checkoutTime", ">=", start),
      where("checkoutTime", "<=", end)
    );

    const snapshot = await getDocs(q);
    const data = [];

    snapshot.forEach((doc) => {
      const d = doc.data();
      if (!d.checkoutTime) return;

      data.push({
        studentId: d.studentId,
        equipment: d.equipment || "Unknown",
        time: d.checkoutTime.toDate(),
        quantity: Number(d.quantity) || 1 // FIXED: Retaining quantity field values
      });
    });

    setSwipeData(data);
  }

  // Fetches combined checkout data for pepsico and westie.
  async function fetchCombinedCheckouts() {
    const { start, end } = getDateRange();
    const collections = ["pepsicoCheckouts", "westerlinCheckouts"];

    let combined = [];

    for (let name of collections) {
      const ref = collection(db, name);

      const q = query(
        ref,
        where("checkoutTime", ">=", start),
        where("checkoutTime", "<=", end)
      );

      const snapshot = await getDocs(q);

      snapshot.forEach((doc) => {
        const d = doc.data();
        if (!d.checkoutTime) return;

        combined.push({
          studentId: d.studentId,
          equipment: d.equipment || "Unknown",
          time: d.checkoutTime.toDate(),
          quantity: Number(d.quantity) || 1 // FIXED: Retaining quantity field values
        });
      });
    }

    setSwipeData(combined);
  }

  // Fetches only guest swipe ins from the "guestEntrance collection"
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
        name: d.name || "", 
        category: d.category || "N/A",
        time: d.timestamp.toDate()
      });
    });

    setSwipeData(data);
  }

  // Called when a user wants to see Demographic data
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

  useEffect(() => {
    if (dataFile === "demographics" && Object.keys(studentMap).length > 0) {
      processDemographics();
    }
  }, [dataFile, demographicType, swipeData, timeRange, startDate, endDate, studentMap]);

  // 🆕 Processes all categorical counts (Equipment distribution, location traffic share, or guest types)
  useEffect(() => {
    if (dataFile === "demographics") return;

    const { start, end } = getDateRange();
    const counts = {};

    swipeData.forEach((swipe) => {
      const date = swipe.time instanceof Date ? swipe.time : new Date(swipe.time);
      if (isNaN(date) || date < start || date > end) return;

      let key = "Unknown";
      if (isCheckoutDataset) {
        key = swipe.equipment || "Unknown";
      } else if (dataFile === "guestEntrance") {
        key = swipe.category || "N/A";
      } else {
        key = swipe.location || "Unspecified Location";
      }

      // FIXED: Sum using the specific checkout quantity if we are looking at equipment checkouts
      const itemWeight = isCheckoutDataset ? (Number(swipe.quantity) || 1) : 1;
      counts[key] = (counts[key] || 0) + itemWeight;
    });

    setCategoricalData(counts);
  }, [dataFile, swipeData, timeRange, startDate, endDate]);

  // Generates the "buckets" of time which will display on the x axis. Dependant on the interval the user chooses
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

      let label = getLabel(cursor);

      if (interval === "hours") {
        cursor.setHours(cursor.getHours() + 1);
      }
      else if (interval === "days") {
        cursor.setDate(cursor.getDate() + 1);
      }
      else if (interval === "weeks") {
        cursor.setDate(cursor.getDate() + 7);
      }
      else if (interval === "months") {
        cursor.setMonth(cursor.getMonth() + 1);
      }
      else if (interval === "years") {
        cursor.setFullYear(cursor.getFullYear() + 1);
      }

      buckets[label] = 0;
    }

    return buckets;
  }

  // Processes all given swipes for a time range
  function processData() {
    const { start, end } = getDateRange();
    const buckets = generateIntervals(start, end);

    swipeData.forEach((swipe) => {
      const date = swipe.time instanceof Date ? swipe.time : new Date(swipe.time);

      if (isNaN(date)) return;
      if (date < start || date > end) return;

      let label = getLabel(date);

      if (interval === "weeks") {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        weekStart.setHours(0, 0, 0, 0);
      }

      // Note: If you are looking at standard non-checkout intervals, it counts entries.
      // Equipment data falls under the specialized categorical condition below.
      if (buckets[label] !== undefined) buckets[label] += 1;
    });

    const formatted = Object.keys(buckets).map((key) => ({
      interval: key,
      swipes: buckets[key]
    }));

    setChartData(formatted);
  }

  // This is important for grouping data across time
  function processGroupedData() {
    const { start, end } = getDateRange();

    let buckets = {};
    let labels = [];

    if (groupBy === "dayOfWeek") {
      labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      labels.forEach((_, i) => (buckets[i] = 0));
    }
    else if (groupBy === "hourOfDay") {
      labels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
      labels.forEach((_, i) => (buckets[i] = 0));
    }
    else if (groupBy === "dayOfMonth") {
      labels = Array.from({ length: 31 }, (_, i) => `${i + 1}`);
      labels.forEach((_, i) => (buckets[i + 1] = 0));
    }
    else if (groupBy === "monthOfYear") {
      labels = [
        "Jan","Feb","Mar","Apr","May","Jun",
        "Jul","Aug","Sep","Oct","Nov","Dec"
      ];
      labels.forEach((_, i) => (buckets[i] = 0));
    }

    swipeData.forEach((swipe) => {
      const date = swipe.time instanceof Date ? swipe.time : new Date(swipe.time);

      if (isNaN(date) || date < start || date > end) return;

      let key;

      if (groupBy === "dayOfWeek") key = date.getDay();
      else if (groupBy === "hourOfDay") key = date.getHours();
      else if (groupBy === "dayOfMonth") key = date.getDate();
      else if (groupBy === "monthOfYear") key = date.getMonth();

      if (buckets[key] !== undefined) buckets[key] += 1;
    });

    const formatted = labels.map((label, i) => ({
      interval: label,
      swipes:
        groupBy === "dayOfMonth"
          ? buckets[i + 1] || 0
          : buckets[i] || 0
    }));

    setChartData(formatted);
  }

  useEffect(() => {
    if (groupBy === "none") {
      processData();
    } else {
      processGroupedData();
    }
  }, [timeRange, interval, startDate, endDate, swipeData, groupBy]);

  const { start, end } = getDateRange();


  // Basic chart data for non-guest swipe ins
  let data = {
    labels: chartData.map((d) => d.interval),
    datasets: [
      {
        label: "Swipes",
        data: chartData.map((d) => d.swipes),
        backgroundColor: "#002F6C",
        borderColor: "#002F6C"
      }
    ]
  };

  const whiteBackgroundPlugin = {
    id: 'customCanvasBackgroundColor',
    beforeDraw: (chart) => {
      const { ctx } = chart;
      ctx.save();
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, chart.width, chart.height);
      ctx.restore();
    }
  };


  if (dataFile === "guestEntrance" || isCheckoutDataset) {
    const { start, end } = getDateRange();

    const categoryMap = {};   
    let labels = [];          

    if (groupBy !== "none") {

      if (groupBy === "dayOfWeek") {
        labels = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
      } else if (groupBy === "hourOfDay") {
        labels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
      } else if (groupBy === "dayOfMonth") {
        labels = Array.from({ length: 31 }, (_, i) => `${i + 1}`);
      } else if (groupBy === "monthOfYear") {
        labels = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      }

      swipeData.forEach((swipe) => {
        const category =
          dataFile === "guestEntrance"
            ? (swipe.category || "N/A")
            : (swipe.equipment || "Unknown");

        if (!categoryMap[category]) {
          categoryMap[category] = Array(labels.length).fill(0);
        }
      });

      swipeData.forEach((swipe) => {
        const date = swipe.time instanceof Date ? swipe.time : new Date(swipe.time);

        if (isNaN(date) || date < start || date > end) return;

        const category =
          dataFile === "guestEntrance"
            ? (swipe.category || "N/A")
            : (swipe.equipment || "Unknown");

        let index;

        if (groupBy === "dayOfWeek") index = date.getDay();
        else if (groupBy === "hourOfDay") index = date.getHours();
        else if (groupBy === "dayOfMonth") index = date.getDate() - 1;
        else if (groupBy === "monthOfYear") index = date.getMonth();

        if (categoryMap[category] && index !== undefined) {
          // FIXED: Increment by actual item quantity instead of adding 1
          const incrementalVolume = isCheckoutDataset ? (Number(swipe.quantity) || 1) : 1;
          categoryMap[category][index] += incrementalVolume;
        }
      });

      data = {
        labels,
        datasets: Object.keys(categoryMap).map((cat) => ({
          label: cat,
          data: categoryMap[cat],
          backgroundColor: getCategoryColor(cat),
          borderColor: getCategoryColor(cat)
        }))
      };

    } else {
      const buckets = generateIntervals(start, end);

      swipeData.forEach((swipe) => {
        const date =
          swipe.time instanceof Date ? swipe.time : new Date(swipe.time);   

        if (isNaN(date) || date < start || date > end) return;

        const category =
          dataFile === "guestEntrance"
            ? (swipe.category || "N/A")
            : (swipe.equipment || "Unknown");   

        if (!categoryMap[category]) {
          categoryMap[category] = { ...buckets };
        }

        let label = getLabel(date);

        if (interval === "weeks") {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          weekStart.setHours(0, 0, 0, 0);
        }

        if (categoryMap[category][label] !== undefined) {
          // FIXED: Increment by actual item quantity instead of adding 1
          const incrementalVolume = isCheckoutDataset ? (Number(swipe.quantity) || 1) : 1;
          categoryMap[category][label] += incrementalVolume;
        }
      });

      data = {
        labels: Object.keys(buckets),
        datasets: Object.keys(categoryMap).map((cat) => ({
          label: cat,
          data: Object.keys(buckets).map((b) => categoryMap[cat][b] || 0),
          backgroundColor: getCategoryColor(cat),
          borderColor: getCategoryColor(cat)
        }))
      };
    }
  }

  // Data configuration object for demographic distributions
  const pieData = {
    labels: Object.keys(demographicData),
    datasets: [
      {
        data: Object.values(demographicData),
        backgroundColor: colorPalette
      }
    ]
  };

  // 🆕 Unified configuration object for new custom categorical distributions
  const generalCategoricalChartData = {
    labels: Object.keys(categoricalData),
    datasets: [
      {
        data: Object.values(categoricalData),
        backgroundColor: colorPalette
      }
    ]
  };

  function renderStatCard(title, thisWeek, lastWeek, accent) {
    const loading = thisWeek === null;
    let change = null;
    if (!loading && lastWeek > 0) change = Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
    const dir = change === null ? null : change >= 0 ? "up" : "down";
    const color = dir === "up" ? "#16a34a" : "#dc2626";

    const upPoints   = "0,28 13,22 26,25 39,18 52,14 65,10 78,5";
    const downPoints = "0,5 13,10 26,8 39,14 52,20 65,24 78,30";
    const points   = dir === "up" ? upPoints : downPoints;
    const fillPath = dir === "up"
      ? "M0,28 L13,22 L26,25 L39,18 L52,14 L65,10 L78,5 L78,35 L0,35 Z"
      : "M0,5 L13,10 L26,8 L39,14 L52,20 L65,24 L78,30 L78,35 L0,35 Z";

    return (
      <div className={`stat-card ${accent}`}>
        <p className="sc-label">{title}</p>
        <p className="sc-value">{loading ? "—" : thisWeek.toLocaleString()}</p>
        {!loading && dir !== null && (
          <div className="sc-trend">
            <svg viewBox="0 0 78 35" width="70" height="30">
              <path d={fillPath} fill={color} fillOpacity="0.12" />
              <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className={`sc-trend-text ${dir}`}>
              {dir === "up" ? "▲" : "▼"} {Math.abs(change)}%
            </span>
          </div>
        )}
        {!loading && <p className="sc-sub">Last week: {lastWeek.toLocaleString()}</p>}
      </div>
    );
  }

  function getLabel(cursor) {
    let label = "";

    if (interval === "hours") {
      label = `${cursor.getMonth() + 1}/${cursor.getDate()}/${cursor.getFullYear()} ${cursor.getHours()}:00`;
    }
    else if (interval === "days") {
      label = `${cursor.getMonth() + 1}/${cursor.getDate()}/${cursor.getFullYear()}`;
    }
    else if (interval === "weeks") {
      label = `${cursor.getMonth() + 1}/${cursor.getDate()}/${cursor.getFullYear()}`;
    }
    else if (interval === "months") {
      label = `${cursor.getMonth() + 1}/${cursor.getFullYear()}`;
    }
    else if (interval === "years") {
      label = `${cursor.getFullYear()}`;
    }
    return label
  }

  // Calculate if the current view exceeds a week right before rendering the controls
  const { start: currentStart, end: currentEnd } = getDateRange();
  const isRangeGreaterThanWeek = ((currentEnd - currentStart) / (1000 * 60 * 60 * 24)) > 7;

  return (
    <>
      <div className="page-header">
      </div>

      <div className="Analytics-page">
        ... (all controls, stat cards, and chart rendering JSX) ...
      </div>
    </>
  );

  END ORIGINAL IMPLEMENTATION
  */

  // Blank page stand-in
  return null;
}

export default Analytics;
