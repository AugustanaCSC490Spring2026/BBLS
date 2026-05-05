// This entire file was generated with help from ChatGPT 
import React, { useState, useEffect, useRef } from "react";
import { Bar, Pie } from "react-chartjs-2"; // ✅ NEW: Added Pie chart
import "../components/Analytics.css";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement, // Needed for pie chart
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);


// Firebase imports
import { db } from "../Firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

function Analytics({ gym, updateGym }) {

  // Chart type state (Swipe-ins vs Demographics)
  const [chartType, setChartType] = useState("swipe");

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

  // Cached student data (FULL FETCH)
  const [studentMap, setStudentMap] = useState({});

  const [dataFile, setDataFile] = useState("normal");

  const [normalData, setNormalData] = useState([]);

  // 🆕 Export dropdown state
  const [exportFormat, setExportFormat] = useState("");

  // State to handle weekly/monthly/daily grouping
  const [groupBy, setGroupBy] = useState("none");

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

  // Gives categories for guest swipes different colors on the graph. Color codes the guest swipes
  const categoryColorMap = {};
  function getCategoryColor(category) {
    if (categoryColorMap[category]) return categoryColorMap[category];

    const palette = [
      "#8884d8",
      "#82ca9d",
      "#ffc658",
      "#ff7f7f",
      "#8dd1e1",
      "#d0ed57",
      "#a4de6c",
      "#a78bfa",
      "#fb7185",
      "#34d399"
    ];

    const index = Object.keys(categoryColorMap).length % palette.length;
    categoryColorMap[category] = palette[index];

    return categoryColorMap[category];
  }

  // Fetch entire currentStudents collection ONCE and cache it
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
      else if (dataFile === "normal") {
        setSwipeData(normalData);
      }
      else {
        setSwipeData(datasets[dataFile] || []);
      }

    }

    loadData();
  }, [dataFile, timeRange, startDate, endDate, normalData]);

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

  // PNG Export
  function exportChartToPNG() {
    let chartInstance = chartRef.current;

    // Some versions wrap it like this:
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
    link.download =
      chartType === "swipe"
        ? "swipe_chart.png"
        : "demographics_chart.png";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // CSV EXPORT 
  function exportSwipeDataToCSV() {
    if (chartType !== "swipe") return;

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

    const hasGuestData = filtered.some(swipe => swipe.studentId === "guest");

    // ✅ UPDATED HEADERS
    const rows = hasGuestData
      ? [["Student ID", "Name", "Swipe Time"]] // DO NOT add email for guests
      : [["Student ID", "Email", "Swipe Time"]];

    filtered.forEach((swipe) => {
      const date =
        swipe.time instanceof Date ? swipe.time : new Date(swipe.time);

      const localTime =
        `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
        `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;

      if (hasGuestData) {
        // ✅ unchanged guest behavior
        rows.push([
          swipe.studentId,
          swipe.studentId === "guest" ? (swipe.name || "") : "",
          localTime
        ]);
      } else {
        // ✅ NEW: pull email from studentMap
        const student = studentMap[swipe.studentId];
        const email = student?.Email || "";

        rows.push([
          swipe.studentId,
          email,
          localTime
        ]);
      }
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      rows.map((row) => row.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");

    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "swipe_data.csv");

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Fetches the given collection form firestore
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

  // Fetches sspecifically pepsico and westerlin
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
        time: d.checkoutTime.toDate()
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
          time: d.checkoutTime.toDate()
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
        name: d.name || "", //  Only for guests
        category: d.category || "N/A",
        time: d.timestamp.toDate()
      });
    });

    setSwipeData(data);
  }

  // Called when a user wants to see Demographic data
  function processDemographics() {
    const { start, end } = getDateRange();
    const counts = {};    // A map containing a demographic value and the count of students that lie within that demographic value

    swipeData.forEach((swipe) => { // goes through each swipe that occured in a given time range
      if (swipe.studentId === "guest") return; // Makes sure the guest data doesn't potentially mess up the grpah since there is no deomgraphics for guests

      const date = swipe.time instanceof Date ? swipe.time : new Date(swipe.time);
      if (isNaN(date) || date < start || date > end) return;

      const student = studentMap[swipe.studentId];

      const fieldName = demographicFieldMap[demographicType];
      let value = student?.[fieldName];

      if (!value || value.trim() === "") value = "N/A";   // If the given value (demogrpahic type) doesn't exist for a student, it is assigned "N/A"

      counts[value] = (counts[value] || 0) + 1;
    });

    setDemographicData(counts);
  }

  useEffect(() => {
    if (chartType === "demographics" && Object.keys(studentMap).length > 0) {
      processDemographics();
    }
  }, [chartType, demographicType, swipeData, timeRange, startDate, endDate, studentMap]);

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

    // Increments cursor from the start time until the end time, designating the labels for the buckets
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

  // Processes all given swipes for a time range
  function processData() {
    const { start, end } = getDateRange();
    const buckets = generateIntervals(start, end);

    // Takes all swipes, and for each swipe it ensures it is valid, calculates the interval for the swipe in time, and increments the value of "buckets" for that given interval (increments the y-axis)
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

    // Formats it to an array for chart use
    const formatted = Object.keys(buckets).map((key) => ({
      interval: key,
      swipes: buckets[key]
    }));

    setChartData(formatted);
  }

  // This is important for grouping data across time, for instance it can group swipes across a given amount of time based off days of the week (Mon, Tue, Wed, etc...)
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
        backgroundColor: "#8884d8"
      }
    ]
  };

  // Takes care of guest swipes. The reason this is done separately than normal swipes is so users can see the reason for visit for each guest. 
  // Otherwise, it functions similarly to normal swipe ins.
  if (dataFile === "guestEntrance") {
    const buckets = generateIntervals(start, end);

    const categoryMap = {};

    swipeData.forEach((swipe) => {
      const date =
        swipe.time instanceof Date ? swipe.time : new Date(swipe.time);   // If the swipe time is not a Date object, converts it

      if (isNaN(date) || date < start || date > end) return;

      const category = swipe.category || "N/A";     // If swipe.category is blank, defaults to N/A (this shouldn't happen, but just in case)


       // Associates each category to it's own clone of buckets. 
       // Basically, allows each cateogry to make it's own graph, which then stacks on top of the other category graphs when displaying the whole graph
      if (!categoryMap[category]) {
        categoryMap[category] = { ...buckets };   
      }

      let label = "";

      // Same logic as processData()
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

      if (categoryMap[category][label] !== undefined) {
        categoryMap[category][label] += 1;
      }
    });

    // Data specifically for guest swipes
    data = {
      labels: Object.keys(buckets),
      datasets: Object.keys(categoryMap).map((cat) => ({
        label: cat,
        data: Object.keys(buckets).map((b) => categoryMap[cat][b] || 0),
        backgroundColor: getCategoryColor(cat)
      }))
    };
  }

  // Data for demographics
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
    <>
      <div className="page-header">
      </div>

      <div className="Analytics-page">
        <div className="analytics-card">
          {/* Chart Type */}
          <div className="control-box">
            <div className="control-content">
              <h3>Chart Type</h3>
              <select
                value={chartType}
                onChange={(e) => setChartType(e.target.value)}
              >
                <option value="swipe">Swipe-ins</option>
                <option value="demographics">Demographics</option>
              </select>
            </div>

            {/* Dataset */}
            <div className="control-content">
              <h3>Dataset</h3>
              <select
                value={dataFile}
                onChange={(e) => setDataFile(e.target.value)}
              >
                <option value="normal">Randomly Generated (non-firebase data)</option>
                <option value="pepsico">PepsiCo Swipes</option>
                <option value="westerlin">Westerlin Swipes</option>
                <option value="combined">Combined Gym Swipes</option>
                <option value="pepsicoCheckouts">PepsiCo Checkouts</option>
                <option value="westerlinCheckouts">Westerlin Checkouts</option>
                <option value="combinedCheckouts">Combined Checkouts</option>

                {chartType !== "demographics" && (
                  <option value="guestEntrance">
                    Guest Entrance
                  </option>
                )}
              </select>
            </div>

            {/* Time Range */}
            <div className="control-content">
              <h3>Choose Time Range</h3>

              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
                <option value="custom">Date Range</option>
              </select>

              {timeRange === "custom" && (
                <div style={{ marginTop: "10px" }}>
                  <input
                    type="date"
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                  <input
                    type="date"
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              )}
            </div>
            {/* Interval / Demographic */}
            <div className="control-content">
              {chartType === "swipe" ? (
                <div className="interval-group-row">

                  <div className="control-item">
                    <h3>Interval</h3>
                    <select
                      value={interval}
                      onChange={(e) => setInterval(e.target.value)}
                      disabled={groupBy !== "none"} // makes the interval selector disabled (unable to click) when we are grouping data
                    >
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                      <option value="weeks">Weeks</option>
                      <option value="months">Months</option>
                      <option value="years">Years</option>
                    </select>
                  </div>

                  {/* Handles grouping by week, day, month, etc ... */}
                  <div className="control-item">
                    <h3>Group By</h3>
                    <select
                      value={groupBy}
                      onChange={(e) => setGroupBy(e.target.value)}
                    >
                      <option value="none">None</option>
                      <option value="hourOfDay">Hour of Day</option>
                      <option value="dayOfWeek">Day of Week</option>
                      <option value="dayOfMonth">Day of Month</option>
                      <option value="monthOfYear">Month of Year</option>
                    </select>
                  </div>

                </div>
              ) : (
                <>
                  <h3>Demographic Type</h3>
                  <select
                    value={demographicType}
                    onChange={(e) =>
                      setDemographicType(e.target.value)
                    }
                  >
                    <option value="Class">Class</option>
                    <option value="Gender">Gender</option>
                    <option value="International/Domestic">
                      International/Domestic
                    </option>
                    <option value="PersonType">PersonType</option>
                    <option value="Race">Race</option>
                    <option value="Residence">Residence</option>
                    <option value="Transfer">Transfer</option>
                  </select>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="charts-boxes">
          <div className="stat-cards">
            <div className="stat-card">

            </div>
            <div className="stat-card">
              
            </div>
            <div className="stat-card">
              
            </div>
          </div>
          <div className="Charts" style={{ marginTop: "30px" }}>
            <div style={{ width: "100%", height: 400, position: "relative" }}>
              {/* 🆕 Export dropdown (swipe only) */}
              <div style={{ position: "absolute", top: 10, right: 10, zIndex: 10 }}>
                <select
                  value={exportFormat}
                  onChange={(e) => {
                    const value = e.target.value;
                    setExportFormat(value);

                    if (value === "csv") exportSwipeDataToCSV();
                    if (value === "png") exportChartToPNG();

                    setExportFormat("");
                  }}
                >
                  <option value="">Export</option>

                  {/* CSV ONLY for swipe charts */}
                  {chartType === "swipe" && (
                    <option value="csv">Export CSV</option>
                  )}

                  {/* PNG available for BOTH chart types */}
                  <option value="png">Export PNG</option>
                </select>
              </div>
              {chartType === "swipe" ? (
                <Bar
                  ref={chartRef}
                  data={data}
                  options={{
                    responsive: true,
                    scales: {
                      x: { stacked: true },
                      y: { stacked: true }
                    }
                  }}
                />
              ) : Object.keys(demographicData).length === 0 ? (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  fontSize: "18px",
                  fontWeight: "500"
                }}>
                  No data
                </div>
              ) : (
                <Pie ref={chartRef} data={pieData} />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Analytics;