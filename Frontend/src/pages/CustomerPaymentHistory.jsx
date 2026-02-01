import React, { useMemo, useState } from "react";
import { useGetCustomerPayHistoryQuery } from "../api/customerPayHistoryApi";

const money = (n) => Number(n || 0).toLocaleString("en-LK");
const safe = (v) => (v === undefined || v === null || v === "" ? "-" : v);

const formatDateTime = (d) => {
  if (!d) return "-";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleString();
};

const payForLabel = (v) => {
  if (v === "interest") return "Interest Only";
  if (v === "principal") return "Investment Amount Only";
  if (v === "interest+principal") return "Investment + Interest";
  return "-";
};

export default function CustomerPaymantHistory() {
  const [searchText, setSearchText] = useState("");

  const { data, isLoading, error, isFetching } =
    useGetCustomerPayHistoryQuery(searchText.trim());

  const rows = useMemo(() => (Array.isArray(data?.data) ? data.data : []), [data]);

  return (
    <div className="w-full flex justify-center p-4 sm:p-6">
      <div className="w-full max-w-6xl">
        <h1 className="text-center text-blue-800 text-2xl sm:text-3xl font-extrabold mb-4">
          Customer Payment History
        </h1>

        {/* SEARCH */}
        <div className="flex flex-col sm:flex-row gap-2 justify-center mb-4">
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search by Customer/Broker, Investment, Note..."
            className="w-full sm:w-[680px] px-4 py-2 bg-gray-100 rounded-xl outline-none"
          />
          <button
            type="button"
            onClick={() => setSearchText("")}
            className="px-4 py-2 bg-white rounded-xl hover:bg-gray-100"
          >
            Clear
          </button>
        </div>

        {/* CARD LIST */}
        <div
          className="relative max-h-[75vh] overflow-y-auto space-y-3 pr-1"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <style>{`
            .hide-scrollbar::-webkit-scrollbar { display: none; }
          `}</style>

          <div className="hide-scrollbar" />

          {isLoading ? (
            <div className="text-center text-gray-500 py-10">Loading...</div>
          ) : error ? (
            <div className="text-center text-red-600 py-10">Failed to load history</div>
          ) : rows.length === 0 ? (
            <div className="text-center text-gray-500 py-10">No records found</div>
          ) : (
            rows.map((r) => {
              const investmentPaid = Boolean(r.isPrincipalFullyPaidAfter);

              return (
                <div
                  key={r._id}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <div className="font-bold text-gray-900">
                        {safe(r.customer?.name)} ({safe(r.customer?.nic)})
                      </div>
                      <div className="text-xs text-gray-500">
                        Broker: {safe(r.broker?.name)} ({safe(r.broker?.nic)})
                      </div>
                    </div>

                    <div className="text-sm font-semibold text-blue-700">
                      Rs. {money(r.paidAmount)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3 text-sm">
                    <div>
                      <div className="text-gray-500 text-xs">Investment</div>
                      <div className="font-semibold">{safe(r.investment?.investmentName)}</div>
                    </div>

                    <div>
                      <div className="text-gray-500 text-xs">Payment Method</div>
                      <div className="font-semibold uppercase">{safe(r.paymentMethod)}</div>
                    </div>

                    <div>
                      <div className="text-gray-500 text-xs">Payment Type</div>
                      <div className="font-semibold">{payForLabel(r.payFor)}</div>
                    </div>

                    {/* ✅ REMOVED: Total Interest Paid card */}

                    <div>
                      <div className="text-gray-500 text-xs">Investment Paid?</div>
                      <div
                        className={`font-bold ${
                          investmentPaid ? "text-green-700" : "text-red-600"
                        }`}
                      >
                        {investmentPaid ? "YES" : "NO"}
                      </div>
                    </div>

                    <div>
                      <div className="text-gray-500 text-xs">Date & Time</div>
                      <div className="font-semibold">{formatDateTime(r.paidAt)}</div>
                    </div>
                  </div>

                  {r.note ? (
                    <div className="mt-3 text-sm text-gray-700 bg-gray-50 rounded-xl p-2">
                      <span className="text-xs text-gray-500">Note:</span> {safe(r.note)}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>

        <div className="mt-2 text-[11px] text-gray-500 text-center">
          {isFetching ? "Updating..." : `Total Records: ${rows.length}`}
        </div>
      </div>
    </div>
  );
}
