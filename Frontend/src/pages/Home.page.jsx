import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AiOutlineBell } from "react-icons/ai";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import { useGetDashboardSummaryQuery } from "../api/dashboardApi";

const formatLKR = (n) =>
  `Rs. ${Number(n || 0).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const monthNames = [
  "January","February","March","April","May","June","July","August","September","October","November","December",
];

const Button = ({ active, children, ...props }) => (
  <button
    {...props}
    className={[
      "px-3 py-2 rounded-xl text-sm font-semibold transition",
      active ? "bg-blue-700 text-white" : "bg-white/70 hover:bg-white text-blue-800",
    ].join(" ")}
  >
    {children}
  </button>
);

const Card = ({ title, value, label, children }) => (
  <div className="bg-gray-200 rounded-2xl shadow-md w-full p-4 sm:p-6">
    <h1 className="text-blue-800 font-extrabold text-lg sm:text-xl md:text-2xl">
      {title}
    </h1>

    <div className="mt-1 flex flex-wrap items-baseline gap-2">
      <h2 className="text-blue-700 font-semibold text-sm sm:text-base md:text-lg">
        {value}
      </h2>

      {label ? (
        <span className="text-xs sm:text-sm font-semibold text-blue-800/80 bg-white/60 px-2 py-0.5 rounded-full">
          {label}
        </span>
      ) : null}
    </div>

    <div className="mt-4 w-full h-[220px] sm:h-[240px] md:h-[260px]">
      {children}
    </div>
  </div>
);

const MonthBarChart = ({ data }) => (
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data} barSize={22}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="label" />
      <YAxis />
      <Tooltip formatter={(v) => formatLKR(v)} />
      <Bar dataKey="value" fill="#1D4ED8" radius={[6, 6, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>
);

export default function HomePage() {
  const now = new Date();
  const defaultYear = now.getFullYear();
  const defaultMonth = now.getMonth() + 1;

  const [granularity, setGranularity] = useState("month"); // day | month | year
  const [year, setYear] = useState(defaultYear);
  const [month, setMonth] = useState(defaultMonth); // used for day + monthly review

  const { data, isLoading, isFetching, isError } = useGetDashboardSummaryQuery({
    granularity,
    year,
    month,
  });

  const labels = data?.labels || [];
  const series = data?.series || {};
  const totals = data?.totals || {};
  const review = data?.monthlyReview || {
    monthLabel: monthNames[month - 1],
    customerPayThisMonth: 0,
    brokerPayThisMonth: 0,
    investmentThisMonth: 0,
  };

  const chartInvestment = useMemo(() => {
    return labels.map((label, i) => ({
      label,
      value: Number(series?.investment?.[i] || 0),
    }));
  }, [labels, series]);

  const chartBrokerCommission = useMemo(() => {
    return labels.map((label, i) => ({
      label,
      value: Number(series?.brokerCommission?.[i] || 0),
    }));
  }, [labels, series]);

  const chartProfit = useMemo(() => {
    return labels.map((label, i) => ({
      label,
      value: Number(series?.profit?.[i] || 0),
    }));
  }, [labels, series]);

  const monthlyReviewData = useMemo(() => {
    return [
      { name: "Brokers Pay (We Paid)", value: Number(review?.brokerPayThisMonth || 0) },
      { name: "Customers Pay (We Got)", value: Number(review?.customerPayThisMonth || 0) },
      { name: "Investment (This Month)", value: Number(review?.investmentThisMonth || 0) },
    ];
  }, [review]);

  const PIE_COLORS = ["#1D4ED8", "#2563EB", "#60A5FA"];

  const topLabel = useMemo(() => {
    if (granularity === "day") return `${monthNames[month - 1]} ${year} (Day Wise)`;
    if (granularity === "month") return `Year ${year} (Month Wise)`;
    return `Last 5 Years (Year Wise)`;
  }, [granularity, year, month]);

  return (
    <div className="p-4 sm:p-6 md:p-10 w-full min-h-screen">
      {/* TOP BAR */}
      <div className="relative mb-4 sm:mb-6">
        <h1 className="text-blue-800 text-xl sm:text-3xl md:text-4xl font-extrabold">
          RunRiver Holding (pvt).Ltd
        </h1>

        <Link
          to="/notification"
          className="absolute right-0 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-gray-100 transition"
          aria-label="Notifications"
        >
          <AiOutlineBell className="text-2xl sm:text-3xl text-gray-700" />
        </Link>

        {/* FILTER BAR */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="flex gap-2 bg-white/50 p-2 rounded-2xl">
            <Button active={granularity === "day"} onClick={() => setGranularity("day")}>
              Day Wise
            </Button>
            <Button active={granularity === "month"} onClick={() => setGranularity("month")}>
              Month Wise
            </Button>
            <Button active={granularity === "year"} onClick={() => setGranularity("year")}>
              Year Wise
            </Button>
          </div>

          <div className="flex items-center gap-2 bg-white/50 p-2 rounded-2xl">
            <span className="text-blue-800 font-semibold text-sm">Year</span>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="rounded-xl px-3 py-2 text-sm bg-white"
            >
              {Array.from({ length: 7 }, (_, i) => defaultYear - 5 + i).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            <span className="text-blue-800 font-semibold text-sm">Month</span>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="rounded-xl px-3 py-2 text-sm bg-white"
              disabled={granularity === "year"} // not needed for yearwise
              title={granularity === "year" ? "Month is not needed for Year Wise view" : ""}
            >
              {monthNames.map((m, idx) => (
                <option key={m} value={idx + 1}>{m}</option>
              ))}
            </select>

            <span className="text-xs text-blue-800/70 font-semibold">
              {isLoading || isFetching ? "Loading..." : topLabel}
              {isError ? " (Error)" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Total Investment */}
        <Card
          title="Total Investment"
          value={formatLKR(totals?.totalInvestment)}
          label={topLabel}
        >
          <MonthBarChart data={chartInvestment} />
        </Card>

        {/* Brokers Pay (Commission Payable) */}
        <Card
          title="Brokers Pay (Commission Total)"
          value={formatLKR(totals?.totalBrokerCommission)}
          label={topLabel}
        >
          <MonthBarChart data={chartBrokerCommission} />
        </Card>

        {/* Total Profit */}
        <Card
          title="Total Profit (Interest - Broker Commission)"
          value={formatLKR(totals?.totalProfit)}
          label={topLabel}
        >
          <MonthBarChart data={chartProfit} />
        </Card>

        {/* Monthly Review */}
        <div className="bg-gray-200 rounded-2xl shadow-md w-full p-4 sm:p-6">
          <h1 className="text-blue-800 font-extrabold text-lg sm:text-xl md:text-2xl">
            Monthly Review
          </h1>

          <div className="mt-1 flex flex-wrap items-baseline gap-2">
            <h2 className="text-blue-700 font-semibold text-sm sm:text-base md:text-lg">
              {formatLKR(
                Number(review?.brokerPayThisMonth || 0) +
                  Number(review?.customerPayThisMonth || 0) +
                  Number(review?.investmentThisMonth || 0)
              )}
            </h2>

            <span className="text-xs sm:text-sm font-semibold text-blue-800/80 bg-white/60 px-2 py-0.5 rounded-full">
              {review?.monthLabel || monthNames[month - 1]}
            </span>
          </div>

          <div className="mt-4 w-full h-[240px] sm:h-[260px] md:h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={monthlyReviewData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius="80%"
                  label
                >
                  {monthlyReviewData.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatLKR(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 space-y-1">
            <h2 className="text-blue-700 text-sm sm:text-base font-semibold">
              Brokers pay (we paid): {formatLKR(review?.brokerPayThisMonth)}
            </h2>
            <h2 className="text-blue-700 text-sm sm:text-base font-semibold">
              Customers pay (we got): {formatLKR(review?.customerPayThisMonth)}
            </h2>
            <h2 className="text-blue-700 text-sm sm:text-base font-semibold">
              Investment this month: {formatLKR(review?.investmentThisMonth)}
            </h2>
          </div>

          <div className="mt-3 text-xs text-blue-800/70 font-semibold">
            Flow: Customers pay you → you pay brokers.
          </div>
        </div>
      </div>
    </div>
  );
}
