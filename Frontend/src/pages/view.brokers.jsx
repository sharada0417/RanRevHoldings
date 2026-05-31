// src/pages/ViewBrokersPage.jsx

import React, { useEffect, useMemo, useState } from "react";
import { useGetBrokersQuery } from "../api/brokerApi";
import {
  useLazyGetBrokerSummaryByNicQuery,
  useLazyGetBrokerSummaryByIdQuery,
} from "../api/brokerpayApi";

const money = (n) => Number(n || 0).toLocaleString("en-LK");

const PayStatusPill = ({ status }) => {
  const map = {
    complete: {
      text: "Complete",
      cls: "bg-green-100 text-green-800 border-green-200",
    },
    pending: {
      text: "Pending",
      cls: "bg-yellow-100 text-yellow-800 border-yellow-200",
    },
  };

  const s = map[status] || map.pending;

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full border text-[11px] font-extrabold ${s.cls}`}
    >
      {s.text}
    </span>
  );
};

const ViewBrokersPage = () => {
  const [searchText, setSearchText] = useState("");

  const { data: brokersRes, isLoading, isError, refetch } = useGetBrokersQuery();
  const [triggerSummaryByNic] = useLazyGetBrokerSummaryByNicQuery();
  const [triggerSummaryById]  = useLazyGetBrokerSummaryByIdQuery();   // ✅ for null-NIC brokers

  const brokers = useMemo(() => brokersRes?.data || [], [brokersRes]);

  // key: broker NIC (uppercase) OR broker _id (for null-NIC brokers)
  // value: { totalEarned, pending, status }
  const [totalsByKey, setTotalsByKey] = useState({});

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return brokers;
    return brokers.filter((b) =>
      `${b.nic || ""} ${b.name || ""}`.toLowerCase().includes(q)
    );
  }, [brokers, searchText]);

  /**
   * Load summary for one broker.
   * - If broker has a NIC  → use /broker/:nic/summary
   * - If broker has no NIC → use /broker/id/:id/summary
   */
  const loadSummary = async (broker) => {
    const nic   = String(broker.nic || "").trim().toUpperCase();
    const mapKey = nic || String(broker._id);  // ✅ always have a key

    try {
      let res;
      if (nic) {
        res = await triggerSummaryByNic(nic).unwrap();
      } else {
        // ✅ broker has no NIC — fetch by _id
        res = await triggerSummaryById(String(broker._id)).unwrap();
      }

      // Backend returns: { totals: { totalEarned, totalPaid, pending } }
      const totalEarned = res?.totals?.totalEarned ?? 0;
      const pending     = res?.totals?.pending     ?? 0;
      const status      = Number(pending) > 0 ? "pending" : "complete";

      setTotalsByKey((prev) => ({
        ...prev,
        [mapKey]: { totalEarned, pending, status },
      }));
    } catch {
      setTotalsByKey((prev) => ({
        ...prev,
        [mapKey]: { totalEarned: 0, pending: 0, status: "complete" },
      }));
    }
  };

  // Auto-load summaries for visible rows (first 50)
  useEffect(() => {
    filtered.slice(0, 50).forEach((b) => {
      const nic    = String(b.nic || "").trim().toUpperCase();
      const mapKey = nic || String(b._id);
      if (!totalsByKey[mapKey]) loadSummary(b);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered]);

  const onRefresh = async () => {
    setTotalsByKey({});
    await refetch();
  };

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-6xl px-3 sm:px-6 py-4 sm:py-6 min-w-0">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-blue-800 text-center">
          View Brokers
        </h1>

        <div className="mt-5 flex flex-col sm:flex-row justify-center gap-2">
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search by Broker NIC / Name"
            className="w-full sm:w-[420px] rounded-xl border px-3 py-2 text-xs sm:text-sm"
          />
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-lg bg-blue-700 px-4 py-2 text-xs sm:text-sm font-bold text-white"
          >
            Refresh
          </button>
        </div>

        {isLoading && (
          <div className="mt-6 text-center text-sm text-gray-500">Loading brokers...</div>
        )}

        {isError && (
          <div className="mt-6 text-center text-sm text-red-600">
            Error loading brokers. Check backend: <b>/api/broker</b>
          </div>
        )}

        {!isLoading && !isError && (
          <div className="mt-6 bg-white rounded-xl shadow-sm min-w-0 overflow-hidden">
            <table className="w-full table-auto">
              <thead className="hidden sm:table-header-group">
                <tr className="bg-gray-100 text-sm">
                  <th className="p-3 w-[160px]">Broker NIC</th>
                  <th className="p-3 w-[240px]">Broker Name</th>
                  <th className="p-3 w-[220px]">Total Commission Earned</th>
                  <th className="p-3 w-[220px]">Pending Payment</th>
                  <th className="p-3 w-[160px]">Status</th>
                </tr>
              </thead>

              <tbody className="block sm:table-row-group">
                {filtered.map((b) => {
                  const nic    = String(b.nic || "").trim().toUpperCase();
                  const mapKey = nic || String(b._id);    // ✅ consistent key
                  const totals = totalsByKey[mapKey];

                  const totalEarned = totals?.totalEarned ?? 0;
                  const pending     = totals?.pending     ?? 0;
                  const status      = totals?.status      ?? "pending";

                  return (
                    <tr
                      key={String(b._id)}
                      className="block sm:table-row border-b sm:border-gray-200 px-2 sm:px-0"
                    >
                      {[
                        ["Broker NIC",               nic || "-"],
                        ["Broker Name",              b.name || "-"],
                        ["Total Commission Earned",
                          totals ? `Rs. ${money(totalEarned)}` : "Loading..."],
                        ["Pending Payment",
                          totals ? `Rs. ${money(pending)}` : "Loading..."],
                      ].map(([label, value]) => (
                        <td
                          key={label}
                          data-label={label}
                          className="
                            block sm:table-cell
                            p-3
                            text-left sm:text-center
                            before:content-[attr(data-label)]
                            before:block sm:before:hidden
                            before:text-[10px] before:text-gray-500 before:mb-1
                          "
                        >
                          <div className="sm:truncate sm:max-w-[240px] mx-auto">{value}</div>
                        </td>
                      ))}

                      <td data-label="Status" className="block sm:table-cell p-3">
                        <div className="flex justify-start sm:justify-center">
                          <PayStatusPill status={status} />
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filtered.length === 0 && (
                  <tr className="block sm:table-row">
                    <td
                      className="block sm:table-cell p-6 text-center text-gray-500"
                      colSpan={5}
                    >
                      No brokers found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-2 text-[11px] text-gray-500 text-center">
          Commission earned = customer interest paid × (brokerRate ÷ totalRate)
        </div>
      </div>
    </div>
  );
};

export default ViewBrokersPage;