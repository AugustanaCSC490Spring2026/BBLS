// This entire file was written with help from ChatGPT

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

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
);

function Analytics() {

  const [timeRange, setTimeRange] = useState("today");
  const [interval, setInterval] = useState("hours");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [chartData, setChartData] = useState([]);

  const swipeData = [
    { time: "2026-03-08T00:10:00" },
    { time: "2026-03-08T00:35:00" },
    { time: "2026-03-08T01:15:00" },
    { time: "2026-03-08T03:42:00" },
    { time: "2026-03-08T03:55:00" },
    { time: "2026-03-08T05:01:00" }
  ];

  function getDateRange() {

    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (timeRange) {

      case "today":
        start.setHours(0,0,0,0);
        break;

      case "yesterday":
        start.setDate(now.getDate() - 1);
        start.setHours(0,0,0,0);

        end.setDate(now.getDate() - 1);
        end.setHours(23,59,59,999);
        break;

      case "week":
        const day = now.getDay();
        start.setDate(now.getDate() - day);
        start.setHours(0,0,0,0);
        break;

      case "month":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;

      case "year":
        start = new Date(now.getFullYear(), 0, 1);
        break;

      case "custom":
        if (startDate) {
          const [y, m, d] = startDate.split("-");
          start = new Date(y, m - 1, d);
          start.setHours(0,0,0,0);
        }

        if (endDate) {
          const [y2, m2, d2] = endDate.split("-");
          end = new Date(y2, m2 - 1, d2);
          end.setHours(23,59,59,999);
        }

        break;

      default:
        break;
    }

    return { start, end };
  }

  function generateIntervals(start, end) {

    let buckets = {};
    let cursor = new Date(start);

    while (cursor <= end) {

      let label;

      if (interval === "hours") {
        label = cursor.getHours() + ":00";
        cursor.setHours(cursor.getHours() + 1);
      }

      else if (interval === "days") {
        label = `${cursor.getMonth()+1}/${cursor.getDate()}`;
        cursor.setDate(cursor.getDate() + 1);
      }

      else if (interval === "months") {
        label = `${cursor.getMonth()+1}/${cursor.getFullYear()}`;
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

    swipeData.forEach(swipe => {

      const date = new Date(swipe.time);

      if (date < start || date > end) return;

      let label;

      if (interval === "hours") {
        label = date.getHours() + ":00";
      }

      else if (interval === "days") {
        label = `${date.getMonth()+1}/${date.getDate()}`;
      }

      else if (interval === "months") {
        label = `${date.getMonth()+1}/${date.getFullYear()}`;
      }

      else if (interval === "years") {
        label = `${date.getFullYear()}`;
      }

      if (buckets[label] !== undefined) {
        buckets[label] += 1;
      }

    });

    const formatted = Object.keys(buckets).map(key => ({
      interval: key,
      swipes: buckets[key]
    }));

    setChartData(formatted);
  }

  useEffect(() => {
    processData();
  }, [timeRange, interval, startDate, endDate]);

  const data = {
    labels: chartData.map(d => d.interval),
    datasets: [
      {
        label: "Swipes",
        data: chartData.map(d => d.swipes),
        backgroundColor: "#8884d8"
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true
      },
      tooltip: {
        callbacks: {
          title: function(context) {

            const index = context[0].dataIndex;
            const { start } = getDateRange();
            const date = new Date(start);

            if (interval === "hours") {
              date.setHours(date.getHours() + index);
              return date.toLocaleString();
            }

            if (interval === "days") {
              date.setDate(date.getDate() + index);
              return date.toLocaleDateString(undefined, {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
              });
            }

            if (interval === "months") {
              date.setMonth(date.getMonth() + index);
              return date.toLocaleDateString(undefined, {
                year: "numeric",
                month: "long"
              });
            }

            if (interval === "years") {
              date.setFullYear(date.getFullYear() + index);
              return date.getFullYear().toString();
            }

          },

          label: function(context) {
            return `Swipes: ${context.raw}`;
          }
        }
      }
    }
  };

  return (

    <div style={{padding:"20px"}}>

      <h1>Analytics Page</h1>

      <h3>Choose Time Range</h3>

      <select value={timeRange} onChange={(e)=>setTimeRange(e.target.value)}>
        <option value="today">Today</option>
        <option value="yesterday">Yesterday</option>
        <option value="week">This Week</option>
        <option value="month">This Month</option>
        <option value="year">This Year</option>
        <option value="custom">Date Range</option>
      </select>

      {timeRange === "custom" && (
        <div>
          <input type="date" onChange={(e)=>setStartDate(e.target.value)} />
          <input type="date" onChange={(e)=>setEndDate(e.target.value)} />
        </div>
      )}

      <h3>Interval</h3>

      <select value={interval} onChange={(e)=>setInterval(e.target.value)}>
        <option value="hours">Hours</option>
        <option value="days">Days</option>
        <option value="months">Months</option>
        <option value="years">Years</option>
      </select>

      <div style={{width:"100%", height:400, marginTop:40}}>
        <Bar data={data} options={options} />
      </div>

    </div>
  );
}

export default Analytics;