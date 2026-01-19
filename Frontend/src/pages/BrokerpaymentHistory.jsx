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

  const rows = data?.data || [];

  // ✅ (optional) local filter too
  const filtered = useMemo(() => {
    const s = searchText.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      `${r.brokerName} ${r.brokerNic} ${r.customerName} ${r.customerNic}`
        .toLowerCase()
        .includes(s)
    );
  }, [rows, searchText]);

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-7xl px-3 sm:px-6 py-4 sm:py-6 min-w-0">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-blue-800 text-center">
          Broker Payment History
        </h1>

        {/* SEARCH */}
        <div className="mt-5 sm:mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2">
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search by Broker NIC/Name or Customer NIC/Name"
            className="w-full sm:w-[520px] rounded-xl border border-gray-300 px-3 py-2 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            type="button"
            onClick={() => setSearchText("")}
            className="w-full sm:w-auto rounded-lg bg-blue-700 px-4 py-2 text-xs sm:text-sm font-bold text-white hover:bg-blue-800 transition"
          >
            Clear
          </button>
        </div>

        {/* HEADER */}
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs sm:text-sm text-gray-600">
            Total: <span className="font-bold">{filtered.length}</span>
          </p>
          <p className="text-[11px] text-gray-500">
            {isFetching ? "Updating..." : ""}
          </p>
        </div>

        {/* TABLE */}
        <div className="mt-3 w-full overflow-x-auto bg-white rounded-xl shadow-sm">
          <table className="w-full min-w-[1200px]">
            <thead className="hidden sm:table-header-group">
              <tr className="bg-gray-100 text-gray-800 text-sm">
                <th className="p-3 text-left">Broker</th>
                <th className="p-3 text-left">Customer</th>
                <th className="p-3 text-center">Customer Pay Month</th>
                <th className="p-3 text-center">Customer Pay Amount</th>
                <th className="p-3 text-center">Broker Paid Month</th>
                <th className="p-3 text-center">Broker Paid Amount</th>
                <th className="p-3 text-center">Total Broker Payable</th>
                <th className="p-3 text-center">Total Broker Paid</th>
                <th className="p-3 text-center">Pending</th>
              </tr>
            </thead>

            <tbody className="block sm:table-row-group">
              {isLoading ? (
                <tr className="block sm:table-row">
                  <td className="block sm:table-cell p-6 text-center text-gray-500" colSpan={9}>
                    Loading...
                  </td>
                </tr>
              ) : error ? (
                <tr className="block sm:table-row">
                  <td className="block sm:table-cell p-6 text-center text-red-600" colSpan={9}>
                    Failed to load broker payment history
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr className="block sm:table-row">
                  <td className="block sm:table-cell p-6 text-center text-gray-500" colSpan={9}>
                    No records found
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const pending = Number(r.brokerPendingPayment || 0);

                  return (
                    <tr
                      key={r.brokerPaymentId}
                      className="
                        block sm:table-row
                        mb-3 sm:mb-0
                        mx-2 sm:mx-0
                        bg-white
                        rounded-lg
                        sm:border-b border-gray-200
                      "
                    >
                      {/* Broker */}
                      <td
                        data-label="Broker"
                        className="block sm:table-cell p-3 text-left sm:text-left
                        before:content-[attr(data-label)] before:block sm:before:hidden
                        before:text-[10px] before:text-gray-500 before:mb-1"
                      >
                        <div className="text-sm font-semibold text-gray-900">
                          {safe(r.brokerName)}
                        </div>
                        <div className="text-xs text-gray-500">{safe(r.brokerNic)}</div>
                      </td>

                      {/* Customer */}
                      <td
                        data-label="Customer"
                        className="block sm:table-cell p-3 text-left sm:text-left
                        before:content-[attr(data-label)] before:block sm:before:hidden
                        before:text-[10px] before:text-gray-500 before:mb-1"
                      >
                        <div className="text-sm font-semibold text-gray-900">
                          {safe(r.customerName)}
                        </div>
                        <div className="text-xs text-gray-500">{safe(r.customerNic)}</div>
                      </td>

                      <td
                        data-label="Customer Pay Month"
                        className="block sm:table-cell p-3 text-left sm:text-center
                        before:content-[attr(data-label)] before:block sm:before:hidden
                        before:text-[10px] before:text-gray-500 before:mb-1"
                      >
                        {safe(r.customerPayMonth)}
                      </td>

                      <td
                        data-label="Customer Pay Amount"
                        className="block sm:table-cell p-3 text-left sm:text-center
                        before:content-[attr(data-label)] before:block sm:before:hidden
                        before:text-[10px] before:text-gray-500 before:mb-1"
                      >
                        {money(r.customerPayAmount)}
                      </td>

                      <td
                        data-label="Broker Paid Month"
                        className="block sm:table-cell p-3 text-left sm:text-center
                        before:content-[attr(data-label)] before:block sm:before:hidden
                        before:text-[10px] before:text-gray-500 before:mb-1"
                      >
                        {safe(r.brokerPaidMonth)}
                      </td>

                      <td
                        data-label="Broker Paid Amount"
                        className="block sm:table-cell p-3 text-left sm:text-center
                        before:content-[attr(data-label)] before:block sm:before:hidden
                        before:text-[10px] before:text-gray-500 before:mb-1"
                      >
                        {money(r.brokerPaidAmount)}
                      </td>

                      <td
                        data-label="Total Broker Payable"
                        className="block sm:table-cell p-3 text-left sm:text-center
                        before:content-[attr(data-label)] before:block sm:before:hidden
                        before:text-[10px] before:text-gray-500 before:mb-1"
                      >
                        {money(r.totalBrokerPayable)}
                      </td>

                      <td
                        data-label="Total Broker Paid"
                        className="block sm:table-cell p-3 text-left sm:text-center
                        before:content-[attr(data-label)] before:block sm:before:hidden
                        before:text-[10px] before:text-gray-500 before:mb-1"
                      >
                        {money(r.totalBrokerPaid)}
                      </td>

                      <td
                        data-label="Pending"
                        className="block sm:table-cell p-3 text-left sm:text-center font-bold
                        before:content-[attr(data-label)] before:block sm:before:hidden
                        before:text-[10px] before:text-gray-500 before:mb-1"
                      >
                        <span className={pending > 0 ? "text-red-600" : "text-green-600"}>
                          {money(r.brokerPendingPayment)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-2 text-center text-[10px] text-gray-500 sm:hidden">
          Scroll left/right if needed.
        </p>
      </div>
    </div>
  );
}
