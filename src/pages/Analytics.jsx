// This entire file was generated with help from ChatGPT
import React, { useState, useEffect } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

// JSON test datasets
import midnightEdge from "./test-data/midnight-edge.json";
import leapYear from "./test-data/leap-year.json";
import duplicates from "./test-data/duplicates.json";
import future from "./test-data/future.json";
import invalid from "./test-data/invalid.json";
import timezone from "./test-data/timezone.json";
import empty from "./test-data/empty.json";

function Analytics() {
  const [timeRange, setTimeRange] = useState("today");
  const [interval, setInterval] = useState("hours");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [chartData, setChartData] = useState([]);
  const [swipeData, setSwipeData] = useState([]);
  const [dataFile, setDataFile] = useState("normal");

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
        case 0:
          return [10, 22];
        case 1:
        case 2:
        case 3:
        case 4:
          return [7, 22];
        case 5:
          return [7, 20];
        case 6:
          return [9, 18];
        default:
          return [7, 22];
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
    if (dataFile === "normal") setSwipeData(generateNormalDataset());
    else setSwipeData(datasets[dataFile] || []);
  }, [dataFile]);

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

  function generateIntervals(start, end) {
    let buckets = {};
    const cursor = new Date(start);

    // Align cursor to start of interval
    if (interval === "hours") {
      cursor.setMinutes(0, 0, 0);

    } else if (interval === "days") {
      cursor.setHours(0, 0, 0, 0);

    } else if (interval === "months") {
      cursor.setDate(1);
      cursor.setHours(0, 0, 0, 0);

    } else if (interval === "years") {
      cursor.setMonth(0, 1);
      cursor.setHours(0, 0, 0, 0);
    }

    while (cursor <= end) {
      let label = "";

      if (interval === "hours") {
        label = `${cursor.getMonth() + 1}/${cursor.getDate()}/${cursor.getFullYear()} ${cursor.getHours()}:00`;
        cursor.setHours(cursor.getHours() + 1);

      } else if (interval === "days") {
        label = `${cursor.getMonth() + 1}/${cursor.getDate()}/${cursor.getFullYear()}`;
        cursor.setDate(cursor.getDate() + 1);

      } else if (interval === "months") {
        label = `${cursor.getMonth() + 1}/${cursor.getFullYear()}`;
        cursor.setMonth(cursor.getMonth() + 1);

      } else if (interval === "years") {
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
      const date = new Date(swipe.time);
      if (isNaN(date)) return;
      if (date < start || date > end) return;

      let label = "";

      if (interval === "hours")
        label = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()} ${date.getHours()}:00`;

      else if (interval === "days")
        label = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;

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

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        callbacks: {
          label: function (context) {
            const idx = context.dataIndex;
            const intervalData = context.chart.data.labels[idx];
            const dataPoint = chartData[idx];
            if (!dataPoint) return "";

            let fullDateStr = intervalData;

            if (interval === "hours") {
              fullDateStr = intervalData.replace(" ", " at ") + ":00";
            } else if (interval === "days") {
              fullDateStr = new Date(intervalData).toLocaleDateString();
            } else if (interval === "months") {
              const [m, y] = intervalData.split("/");
              fullDateStr = new Date(y, m - 1, 1).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long"
              });
            } else if (interval === "years") {
              fullDateStr = intervalData;
            }

            return `Date: ${fullDateStr}, Swipes: ${dataPoint.swipes}`;
          }
        }
      }
    }
  };

  return (
    <div style={{ padding: "20px" }}>
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

      <h3>Interval</h3>
      <select value={interval} onChange={(e) => setInterval(e.target.value)}>
        <option value="hours">Hours</option>
        <option value="days">Days</option>
        <option value="months">Months</option>
        <option value="years">Years</option>
      </select>

      <div style={{ width: "100%", height: 400, marginTop: 40 }}>
        <Bar data={data} options={options} />
      </div>
    </div>
  );
}

export default Analytics;