import React, { useMemo, useState } from "react";
import { useGetBrokerPayHistoryQuery } from "../api/brokerPayHistoryApi";

const money = (n) =>
  `Rs. ${Number(n || 0).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const safe = (v) => (v === undefined || v === null || v === "" ? "-" : v);

export default function BrokerPaymantHistory() {
  const [searchText, setSearchText] = useState("");

  const { data, isLoading, error, isFetching } = useGetBrokerPayHistoryQuery(
    searchText.trim()
  );

  const rows = useMemo(() => (Array.isArray(data?.data) ? data.data : []), [data]);

  // optional local filter
  const filtered = useMemo(() => {
    const s = searchText.trim().toLowerCase();
    if (!s) return rows;

    return rows.filter((r) => {
      const customerText = (r.customers || [])
        .map((c) => `${c.name} ${c.nic}`)
        .join(" ");
      const str = `${r.brokerName} ${r.brokerNic} ${customerText}`.toLowerCase();
      return str.includes(s);
    });
  }, [rows, searchText]);

  return (
    <div className="w-full flex justify-center p-4 sm:p-6">
      <div className="w-full max-w-6xl">
        <h1 className="text-center text-blue-800 text-2xl sm:text-3xl font-extrabold mb-4">
          Broker Payment History
        </h1>

        {/* SEARCH */}
        <div className="flex flex-col sm:flex-row gap-2 justify-center mb-4">
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search by Broker NIC/Name or Customer NIC/Name"
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
            <div className="text-center text-red-600 py-10">
              Failed to load broker payment history
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-gray-500 py-10">No records found</div>
          ) : (
            filtered.map((r) => (
              <div
                key={r.brokerPaymentId}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4"
              >
                {/* TOP */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <div className="font-bold text-gray-900">
                      {safe(r.brokerName)} ({safe(r.brokerNic)})
                    </div>
                    <div className="text-xs text-gray-500">
                      Month Range: <span className="font-semibold">{safe(r.monthRange)}</span>
                    </div>
                  </div>

                  <div className="text-sm font-semibold text-blue-700">
                    {money(r.brokerPaidAmount)}
                  </div>
                </div>

                {/* DETAILS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3 text-sm">
                  <div>
                    <div className="text-gray-500 text-xs">Payment Month</div>
                    <div className="font-semibold">{safe(r.brokerPaidMonth)}</div>
                  </div>

                  <div>
                    <div className="text-gray-500 text-xs">Payment Date & Time</div>
                    <div className="font-semibold">{safe(r.brokerPaidDateTime)}</div>
                  </div>

                  <div>
                    <div className="text-gray-500 text-xs">Pending Broker Commission</div>
                    <div
                      className={`font-bold ${
                        Number(r.brokerPendingPayment || 0) > 0
                          ? "text-red-600"
                          : "text-green-700"
                      }`}
                    >
                      {money(r.brokerPendingPayment)}
                    </div>
                  </div>
                </div>

                {/* OPTIONAL customers list */}
                {Array.isArray(r.customers) && r.customers.length > 0 ? (
                  <div className="mt-3 text-sm text-gray-700 bg-gray-50 rounded-xl p-2">
                    <div className="text-xs text-gray-500 mb-1">Customers in this payment:</div>
                    <div className="space-y-1">
                      {r.customers.map((c, idx) => (
                        <div key={idx} className="text-xs">
                          • {safe(c.name)} ({safe(c.nic)})
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {r.note ? (
                  <div className="mt-3 text-sm text-gray-700 bg-gray-50 rounded-xl p-2">
                    <span className="text-xs text-gray-500">Note:</span> {safe(r.note)}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>

        <div className="mt-2 text-[11px] text-gray-500 text-center">
          {isFetching ? "Updating..." : `Total Records: ${filtered.length}`}
        </div>
      </div>
    </div>
  );
}
