// This entire file was generated with help from ChatGPT and Gemini
import React, { useState, useEffect, useRef } from "react";
import { Bar, Pie, Line, Radar } from "react-chartjs-2"; 
import "../components/Analytics.css";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  RadialLinearScale, // Required for radar mapping
  BarElement,
  ArcElement, // Needed for pie chart
  Tooltip,
  Legend,
  LineElement,
  PointElement
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, RadialLinearScale, BarElement, ArcElement, Tooltip, Legend, LineElement, PointElement);


// Firebase imports
import { db } from "../Firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

function Analytics({ gym, updateGym }) {

  // Chart type state updated to visual variants (Bar vs Pie vs Line vs Radar) for easy scaling
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

  // Cached student data (FULL FETCH)
  const [studentMap, setStudentMap] = useState({});

  const [dataFile, setDataFile] = useState("combined");

  // 🆕 Export dropdown state
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
            if (t >= thisWeekStart) twCheckouts++; else lwCheckouts++;
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

  // Key useEffect that reloads charts anytime an attribute of the chart changes (one of the drop-downs). This one leads to swipeData being generated (based off a given collection, gets swipes for that range)
  useEffect(() => {
    async function loadData() {

      if (dataFile === "pepsico") {
        await fetchSpecificCollection("pepsicoCenter");
      }
      else if (dataFile === "westerlin") {
        await fetchSpecificCollection("westerlinGym");
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

    if (chartType === "pie" || dataFile === "demographics") {
      baseName = "demographic_data";
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

    if (chartType === "pie") return;   // Allowed for both bar and line charts

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

    // Controls headers within the CSV file
    const timeColumnLabel = isCheckoutDataset
      ? "Checkout Time"
      : "Swipe Time";

    const rows = hasGuestData
      ? [["Student ID", "Name", timeColumnLabel]]
      : [["Student ID", "Email", timeColumnLabel]];

    filtered.forEach((swipe) => {
      const date =
        swipe.time instanceof Date ? swipe.time : new Date(swipe.time);

      const localTime =
        `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
        `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;

      if (hasGuestData) {
        rows.push([
          swipe.studentId,
          swipe.studentId === "guest" ? (swipe.name || "") : "",
          localTime
        ]);
      } else {
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
    link.setAttribute("download", generateExportFileName("csv"));

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
        equipment: d.equipment || "Unknown",
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
          equipment: d.equipment || "Unknown",
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
          categoryMap[category][index] += 1;
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
          categoryMap[category][label] += 1;
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

  // Data for demographics
  const pieData = {
    labels: Object.keys(demographicData),
    datasets: [
      {
        data: Object.values(demographicData),
        backgroundColor: [
          "#8dd1e1",
          "#82ca9d",
          "#8884d8",
          "#ff7f7f",
          "#ffc658",
          "#d0ed57",
          "#a4de6c"
        ]
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

  return (
    <>
      <div className="page-header">
      </div>

      <div className="Analytics-page">
        <div className="analytics-card">
          <div className="analytics-card-header">
            <h2>Chart Controls</h2>
          </div>
          <div className="control-box">
            
            {/* 1. DATASET PICKER */}
            <div className="control-content">
              <p className="control-label">Dataset</p>
              <select
                value={dataFile}
                onChange={(e) => {
                  const selectedDataset = e.target.value;
                  setDataFile(selectedDataset);
                  
                  // Guard rails for chart types when switching datasets
                  if (selectedDataset === "demographics") {
                    if (chartType === "line") setChartType("bar");
                  } else {
                    if (chartType === "pie" || chartType === "radar") {
                      setChartType("bar");
                    }
                  }
                }}
              >
                <option value="pepsico">PepsiCo Swipes</option>
                <option value="westerlin">Westerlin Swipes</option>
                <option value="combined">Combined Gym Swipes</option>
                <option value="pepsicoCheckouts">PepsiCo Equipment Checkouts</option>
                <option value="westerlinCheckouts">Westerlin Equipment Checkouts</option>
                <option value="combinedCheckouts">Combined Gym Equipment Checkouts</option>
                <option value="guestEntrance">Guest Entrance</option>
                <option value="demographics">Demographics</option>
              </select>
            </div>

            {/* 2. CHART TYPE */}
            <div className="control-content">
              <p className="control-label">Chart Type</p>
              <select
                value={chartType}
                onChange={(e) => setChartType(e.target.value)}
              >
                <option value="bar">Bar Chart</option>
                
                {dataFile !== "demographics" && (
                  <option value="line">Line Chart</option>
                )}

                {/* 🆕 Radar is strictly exclusive to demographics now */}
                {dataFile === "demographics" && (
                  <option value="radar">Radar Chart</option>
                )}

                {dataFile === "demographics" && (
                  <option value="pie">Pie Chart</option>
                )}
              </select>
            </div>

            {/* 3. TIME RANGE */}
            <div className="control-content">
              <p className="control-label">Time Range</p>

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
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "6px" }}>
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

            {/* 4. DYNAMIC SUB-CONTROLS */}
            <div className="control-content">
              {dataFile !== "demographics" ? (
                <div className="interval-group-row">

                  <div className="control-item">
                    <p className="control-label">Interval</p>
                    <select
                      value={interval}
                      onChange={(e) => setInterval(e.target.value)}
                      disabled={groupBy !== "none"} 
                    >
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                      <option value="weeks">Weeks</option>
                      <option value="months">Months</option>
                      <option value="years">Years</option>
                    </select>
                  </div>

                  <div className="control-item">
                    <p className="control-label">Group By</p>
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
                  <p className="control-label">Demographic Type</p>
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
            {renderStatCard("Swipe-ins This Week", statData.thisWeekSwipes, statData.lastWeekSwipes, "sc-blue")}
            {renderStatCard("Equipment Checkouts", statData.thisWeekCheckouts, statData.lastWeekCheckouts, "sc-yellow")}
            {renderStatCard("Unique Visitors", statData.thisWeekUnique, statData.lastWeekUnique, "sc-blue")}
          </div>
          <div className="Charts" style={{ marginTop: "30px" }}>
            <div style={{ width: "100%", height: 400, position: "relative" }}>
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
                  {(chartType !== "pie" || dataFile === "demographics") && (
                    <option value="csv">Export CSV</option>
                  )}
                  <option value="png">Export PNG</option>
                </select>
              </div>
              {chartType === "bar" ? (
                <Bar
                  ref={chartRef}
                  data={dataFile === "demographics" ? {
                    labels: Object.keys(demographicData),
                    datasets: [{
                      label: demographicType,
                      data: Object.values(demographicData),
                      backgroundColor: "#002F6C",
                      borderColor: "#002F6C"
                    }]
                  } : data}
                  plugins={[whiteBackgroundPlugin]}
                  options={{
                    responsive: true,
                    scales: {
                      x: { stacked: true },
                      y: { stacked: true }
                    }
                  }}
                />
              ) : chartType === "line" ? (
                <Line
                  ref={chartRef}
                  data={dataFile === "demographics" ? {
                    labels: Object.keys(demographicData),
                    datasets: [{
                      label: demographicType,
                      data: Object.values(demographicData),
                      backgroundColor: "rgba(0, 47, 108, 0.2)",
                      borderColor: "#002F6C"
                    }]
                  } : data}
                  plugins={[whiteBackgroundPlugin]}
                  options={{
                    responsive: true,
                    scales: {
                      x: { stacked: false },
                      y: { stacked: false }
                    }
                  }}
                />
              ) : chartType === "radar" ? (
                <Radar
                  ref={chartRef}
                  data={{
                    labels: Object.keys(demographicData),
                    datasets: [{
                      label: demographicType,
                      data: Object.values(demographicData),
                      backgroundColor: "rgba(0, 47, 108, 0.2)",
                      borderColor: "#002F6C",
                      pointBackgroundColor: "#002F6C"
                    }]
                  }}
                  plugins={[whiteBackgroundPlugin]}
                  options={{
                    responsive: true,
                    scales: {
                      r: {
                        beginAtZero: true
                      }
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
                <Pie ref={chartRef} data={pieData} plugins={[whiteBackgroundPlugin]} />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Analytics;