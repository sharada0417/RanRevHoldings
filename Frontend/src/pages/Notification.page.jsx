// src/pages/NotificationPage.jsx

import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AiOutlineHome } from "react-icons/ai";
import { useGetNotificationsQuery } from "../api/notificationApi";

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
const money = (n) =>
  `Rs. ${Number(n || 0).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const safe = (v) => (v === undefined || v === null || v === "" ? "-" : v);

const fmtDate = (d) => {
  if (!d) return "-";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleDateString("en-LK", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};

/* ─────────────────────────────────────────────
   Detail Modal
───────────────────────────────────────────── */
const DetailModal = ({ entry, onClose }) => {
  if (!entry) return null;
  const { customer, arrearsInvestments, totalArrearsInterest, totalArrearsMonths, earliestArrearsDate } = entry;

  // Collect unique brokers from this customer's investments
  const brokers = useMemo(() => {
    const seen = new Set();
    const list = [];
    for (const inv of arrearsInvestments) {
      if (inv.broker && !seen.has(String(inv.broker._id))) {
        seen.add(String(inv.broker._id));
        list.push(inv.broker);
      }
    }
    return list;
  }, [arrearsInvestments]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-3 py-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-blue-800">
          <div>
            <h2 className="text-lg font-extrabold text-white">Arrears Details</h2>
            <p className="text-xs text-blue-200 mt-0.5">Full breakdown for this customer</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-white/30 px-3 py-1.5 text-sm font-bold text-white hover:bg-white/10 transition"
          >
            Close
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">

          {/* ── Customer Info ── */}
          <section>
            <h3 className="text-xs font-extrabold text-gray-500 uppercase tracking-wider mb-2">
              Customer
            </h3>
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {[
                ["Name", safe(customer?.name)],
                ["NIC", safe(customer?.nic)],
                ["TP Number", safe(customer?.tpNumber)],
                ["Address", safe(customer?.address)],
                ["City", safe(customer?.city)],
              ].map(([label, value]) => (
                <div key={label}>
                  <div className="text-[11px] text-gray-500 font-semibold">{label}</div>
                  <div className="font-bold text-gray-900 break-words">{value}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Broker(s) Info ── */}
          {brokers.length > 0 && (
            <section>
              <h3 className="text-xs font-extrabold text-gray-500 uppercase tracking-wider mb-2">
                Broker{brokers.length > 1 ? "s" : ""}
              </h3>
              <div className="space-y-2">
                {brokers.map((b) => (
                  <div
                    key={String(b._id)}
                    className="bg-gray-50 rounded-xl border border-gray-200 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm"
                  >
                    {[
                      ["Name", safe(b?.name)],
                      ["NIC", safe(b?.nic)],
                      ["TP Number", safe(b?.tpNumber)],
                      ["Address", safe(b?.address)],
                      ["City", safe(b?.city)],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <div className="text-[11px] text-gray-500 font-semibold">{label}</div>
                        <div className="font-bold text-gray-900 break-words">{value}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Arrears Summary ── */}
          <section>
            <h3 className="text-xs font-extrabold text-gray-500 uppercase tracking-wider mb-2">
              Arrears Summary
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-center">
                <div className="text-[11px] text-red-600 font-bold">Total Arrears Amount</div>
                <div className="text-base font-extrabold text-red-800 mt-1">
                  {money(totalArrearsInterest)}
                </div>
              </div>
              <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-center">
                <div className="text-[11px] text-orange-600 font-bold">Arrears Months</div>
                <div className="text-base font-extrabold text-orange-800 mt-1">
                  {safe(totalArrearsMonths)} month{totalArrearsMonths !== 1 ? "s" : ""}
                </div>
              </div>
              <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-center">
                <div className="text-[11px] text-yellow-700 font-bold">Arrears Since</div>
                <div className="text-base font-extrabold text-yellow-800 mt-1">
                  {fmtDate(earliestArrearsDate)}
                </div>
              </div>
            </div>
          </section>

          {/* ── Investment Breakdown ── */}
          <section>
            <h3 className="text-xs font-extrabold text-gray-500 uppercase tracking-wider mb-2">
              Investment Breakdown ({arrearsInvestments.length})
            </h3>
            <div className="space-y-3">
              {arrearsInvestments.map((inv) => (
                <div
                  key={String(inv._id)}
                  className="rounded-2xl border border-red-200 bg-red-50 p-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                    <div>
                      <div className="font-extrabold text-gray-900">{safe(inv.investmentName)}</div>
                      <div className="text-xs text-gray-600 mt-0.5">
                        Start: <b>{fmtDate(inv.startDate)}</b> · Cycles: <b>{safe(inv.cycles)}</b> · Arrears since: <b>{fmtDate(inv.arrearsStartDate)}</b>
                      </div>
                    </div>
                    <div className="text-sm font-extrabold text-red-700">
                      Arrears: {money(inv.arrearsInterest)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                    {[
                      ["Investment Amount", money(inv.investmentAmount)],
                      ["Monthly Interest", money(inv.monthlyTotalInterest)],
                      ["Interest Paid", money(inv.interestPaid)],
                      ["Principal Pending", money(inv.principalPending)],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl bg-white border p-2.5">
                        <div className="text-[10px] text-gray-500 font-bold">{label}</div>
                        <div className="font-extrabold text-gray-900 text-xs mt-0.5">{value}</div>
                      </div>
                    ))}
                  </div>

                  {inv.broker && (
                    <div className="mt-2 rounded-xl bg-white border p-2.5 text-sm">
                      <span className="text-[10px] text-gray-500 font-bold">Broker: </span>
                      <span className="font-bold text-gray-900">
                        {safe(inv.broker.name)} ({safe(inv.broker.nic)})
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   Arrears Card  (one customer row)
───────────────────────────────────────────── */
const ArrearsCard = ({ entry, showWarning, onViewDetails }) => {
  const { customer, totalArrearsInterest, totalArrearsMonths, earliestArrearsDate, hasTodayDue } = entry;

  return (
    <div
      className={[
        "rounded-2xl border shadow-sm p-4 transition-all",
        showWarning
          ? "border-orange-300 bg-orange-50"
          : "border-gray-200 bg-white",
      ].join(" ")}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Left: customer name + arrears starting date */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-extrabold text-gray-900 text-base">
              {safe(customer?.name)}
            </span>
            {showWarning && (
              <span className="inline-flex items-center gap-1 bg-orange-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                ⚠ TODAY ALSO DUE
              </span>
            )}
          </div>
          <div className="mt-1 text-xs text-gray-600 space-y-0.5">
            <div>
              NIC: <b>{safe(customer?.nic)}</b> · TP: <b>{safe(customer?.tpNumber)}</b>
            </div>
            <div>
              Arrears since: <b className="text-red-700">{fmtDate(earliestArrearsDate)}</b>
            </div>
          </div>
        </div>

        {/* Middle: stats */}
        <div className="flex gap-3 flex-wrap sm:flex-nowrap">
          <div className="rounded-xl bg-red-100 border border-red-200 px-3 py-2 text-center min-w-[90px]">
            <div className="text-[10px] text-red-600 font-bold">Arrears</div>
            <div className="text-sm font-extrabold text-red-800">{money(totalArrearsInterest)}</div>
          </div>
          <div className="rounded-xl bg-yellow-100 border border-yellow-200 px-3 py-2 text-center min-w-[70px]">
            <div className="text-[10px] text-yellow-700 font-bold">Months</div>
            <div className="text-sm font-extrabold text-yellow-900">{totalArrearsMonths}</div>
          </div>
        </div>

        {/* Right: view details */}
        <button
          onClick={onViewDetails}
          className="rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold px-4 py-2 text-sm transition whitespace-nowrap"
        >
          View Details
        </button>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   Today Arrears Card
───────────────────────────────────────────── */
const TodayCard = ({ entry, onViewDetails }) => {
  const { customer, totalArrearsInterest, totalArrearsMonths, hasPreviousArrears } = entry;

  return (
    <div
      className={[
        "rounded-2xl border shadow-sm p-4 transition-all",
        hasPreviousArrears
          ? "border-red-400 bg-red-50"
          : "border-blue-200 bg-blue-50",
      ].join(" ")}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Left */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-extrabold text-gray-900 text-base">
              {safe(customer?.name)}
            </span>
            {hasPreviousArrears ? (
              <span className="inline-flex items-center gap-1 bg-red-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                🔴 HAS PREVIOUS ARREARS
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 bg-blue-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                TODAY
              </span>
            )}
          </div>
          <div className="mt-1 text-xs text-gray-600 space-y-0.5">
            <div>
              NIC: <b>{safe(customer?.nic)}</b> · TP: <b>{safe(customer?.tpNumber)}</b>
            </div>
            {hasPreviousArrears && (
              <div className="text-red-700 font-semibold">
                ⚠ If not paid today, will move to Previous Arrears tomorrow
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        {hasPreviousArrears && (
          <div className="flex gap-3 flex-wrap sm:flex-nowrap">
            <div className="rounded-xl bg-red-100 border border-red-200 px-3 py-2 text-center min-w-[90px]">
              <div className="text-[10px] text-red-600 font-bold">Arrears</div>
              <div className="text-sm font-extrabold text-red-800">{money(totalArrearsInterest)}</div>
            </div>
            <div className="rounded-xl bg-yellow-100 border border-yellow-200 px-3 py-2 text-center min-w-[70px]">
              <div className="text-[10px] text-yellow-700 font-bold">Months</div>
              <div className="text-sm font-extrabold text-yellow-900">{totalArrearsMonths}</div>
            </div>
          </div>
        )}

        {/* View details */}
        <button
          onClick={onViewDetails}
          className="rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold px-4 py-2 text-sm transition whitespace-nowrap"
        >
          View Details
        </button>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   Main Page
───────────────────────────────────────────── */
const NotificationPage = () => {
  const [activeTab, setActiveTab] = useState("previous"); // "previous" | "today"
  const [selectedEntry, setSelectedEntry] = useState(null);

  const { data, isLoading, isError, refetch, isFetching } = useGetNotificationsQuery();

  const previousArrears = useMemo(
    () => (Array.isArray(data?.previousArrears) ? data.previousArrears : []),
    [data]
  );

  const todayArrears = useMemo(
    () => (Array.isArray(data?.todayArrears) ? data.todayArrears : []),
    [data]
  );

  const prevCount = previousArrears.length;
  const todayCount = todayArrears.length;

  return (
    <>
      {/* Detail Modal */}
      {selectedEntry && (
        <DetailModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
      )}

      <div className="w-full min-h-screen p-4 sm:p-6 md:p-10 bg-gray-50">

        {/* ── Top bar ── */}
        <div className="relative mb-6">
          <h1 className="text-center text-blue-800 text-2xl sm:text-3xl md:text-4xl font-extrabold">
            Notifications
          </h1>
          <Link
            to="/home"
            aria-label="Home"
            className="absolute right-0 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-gray-200 transition"
          >
            <AiOutlineHome className="text-2xl sm:text-3xl text-gray-700" />
          </Link>
        </div>

        {/* ── Refresh ── */}
        <div className="flex justify-center mb-4">
          <button
            onClick={refetch}
            disabled={isFetching}
            className="rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold px-5 py-2 text-sm transition disabled:opacity-60"
          >
            {isFetching ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* ── Toggle Tabs ── */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex bg-white rounded-2xl border border-gray-200 shadow-sm p-1 gap-1">
            <button
              onClick={() => setActiveTab("previous")}
              className={[
                "relative flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-extrabold transition-all",
                activeTab === "previous"
                  ? "bg-red-600 text-white shadow"
                  : "text-gray-600 hover:bg-gray-100",
              ].join(" ")}
            >
              Previous Arrears
              {prevCount > 0 && (
                <span
                  className={[
                    "inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-extrabold",
                    activeTab === "previous"
                      ? "bg-white text-red-600"
                      : "bg-red-600 text-white",
                  ].join(" ")}
                >
                  {prevCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("today")}
              className={[
                "relative flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-extrabold transition-all",
                activeTab === "today"
                  ? "bg-blue-700 text-white shadow"
                  : "text-gray-600 hover:bg-gray-100",
              ].join(" ")}
            >
              Today's Expiry
              {todayCount > 0 && (
                <span
                  className={[
                    "inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-extrabold",
                    activeTab === "today"
                      ? "bg-white text-blue-700"
                      : "bg-blue-700 text-white",
                  ].join(" ")}
                >
                  {todayCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── Loading / Error ── */}
        {isLoading && (
          <div className="text-center text-gray-500 py-10">Loading notifications...</div>
        )}
        {isError && (
          <div className="text-center text-red-600 py-10">
            Failed to load notifications. Check backend: <b>/api/notifications</b>
          </div>
        )}

        {/* ── PREVIOUS ARREARS ── */}
        {!isLoading && !isError && activeTab === "previous" && (
          <div className="max-w-4xl mx-auto">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-extrabold text-gray-800">
                Previous Arrears
                <span className="ml-2 text-sm font-semibold text-gray-500">
                  ({prevCount} customer{prevCount !== 1 ? "s" : ""})
                </span>
              </h2>
            </div>

            {prevCount === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500">
                No previous arrears found. All customers are up to date.
              </div>
            ) : (
              <div className="space-y-3">
                {previousArrears.map((entry) => (
                  <ArrearsCard
                    key={String(entry.customerId)}
                    entry={entry}
                    showWarning={entry.isAlsoTodayDue}
                    onViewDetails={() => setSelectedEntry(entry)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TODAY'S EXPIRY ── */}
        {!isLoading && !isError && activeTab === "today" && (
          <div className="max-w-4xl mx-auto">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-extrabold text-gray-800">
                Today's Expiry
                <span className="ml-2 text-sm font-semibold text-gray-500">
                  ({todayCount} customer{todayCount !== 1 ? "s" : ""})
                </span>
              </h2>
            </div>

            {todayCount === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500">
                No payments are due today.
              </div>
            ) : (
              <div className="space-y-3">
                {todayArrears.map((entry) => (
                  <TodayCard
                    key={String(entry.customerId)}
                    entry={entry}
                    onViewDetails={() => setSelectedEntry(entry)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </>
  );
};

export default NotificationPage;