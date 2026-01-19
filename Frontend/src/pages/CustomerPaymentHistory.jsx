import React, { useState } from "react";
import { useGetCustomerPayHistoryQuery } from "../api/customerPayHistoryApi";

const money = (n) => Number(n || 0).toLocaleString("en-LK");
const safe = (v) => (v === undefined || v === null || v === "" ? "-" : v);

export default function CustomerPaymantHistory() {
  const [searchText, setSearchText] = useState("");

  const { data, isLoading, error, isFetching } = useGetCustomerPayHistoryQuery(
    searchText.trim()
  );

  const rows = data?.data || [];

  return (
    <div className="w-full flex justify-center p-4 sm:p-6">
      <div className="w-full max-w-7xl">
        <h1 className="text-center text-blue-800 text-2xl sm:text-3xl font-extrabold mb-4">
          Customer Payment History (Asset Wise)
        </h1>

        {/* SEARCH (no outline, no ring) */}
        <div className="flex flex-col sm:flex-row gap-2 justify-center mb-4">
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search by Customer NIC/Name or Asset"
            className="
              w-full sm:w-[560px]
              px-4 py-2
              bg-gray-100
              border-0
              rounded-none
              outline-none
              focus:outline-none
              focus:ring-0
            "
          />
          <button
            type="button"
            onClick={() => setSearchText("")}
            className="
              px-4 py-2
              bg-white
              border-0
              rounded-none
              outline-none
              focus:outline-none
              focus:ring-0
              hover:bg-gray-100
            "
          >
            Clear
          </button>
        </div>

        {/* TABLE (NO BLACK OUTLINES) */}
        <div className="overflow-x-auto bg-white">
          <table className="w-full min-w-[1250px] border-collapse">
            <thead className="bg-gray-50 text-gray-800 text-sm">
              <tr>
                <th className="p-3 text-left">Customer</th>
                <th className="p-3 text-left">Asset</th>
                <th className="p-3 text-center">This Month Pay</th>
                <th className="p-3 text-center">Monthly Due</th>
                <th className="p-3 text-center">Arrears Months</th>
                <th className="p-3 text-center">Arrears Amount</th>
                <th className="p-3 text-center">Total Paid</th>
                <th className="p-3 text-center">Pending</th>
                <th className="p-3 text-center">Remaining Months</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-red-600">
                    Failed to load history
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-gray-500">
                    No records found
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const arrearsAmount = Number(r.arrearsAmount || 0);
                  const pendingPayment = Number(r.pendingPayment || 0);

                  const arrearsIsRed = arrearsAmount > 0;
                  const pendingIsBlue = pendingPayment > 0;

                  return (
                    <tr key={r.investmentId}>
                      {/* Customer */}
                      <td className="p-3">
                        <div className="text-sm font-semibold text-gray-900">
                          {safe(r.customerName)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {safe(r.customerNic)}
                        </div>
                      </td>

                      {/* Asset */}
                      <td className="p-3">
                        <div className="text-sm font-semibold text-gray-900">
                          {safe(r.assetName)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {safe(r.assetType)}
                        </div>

                        {(r.vehicleNumber || r.landAddress) && (
                          <div className="text-[11px] text-gray-500 mt-1">
                            {r.vehicleNumber
                              ? `Vehicle: ${r.vehicleNumber}`
                              : `Land: ${r.landAddress}`}
                          </div>
                        )}
                      </td>

                      <td className="p-3 text-center text-sm">
                        Rs. {money(r.thisMonthPayment)}
                      </td>

                      <td className="p-3 text-center text-sm">
                        Rs. {money(r.monthlyDue)}
                      </td>

                      {/* Arrears Months (RED only if arrears > 0) */}
                      <td
                        className={`p-3 text-center text-sm font-bold ${
                          arrearsIsRed ? "text-red-600" : "text-gray-800"
                        }`}
                      >
                        {safe(r.arrearsMonths)}
                      </td>

                      {/* Arrears Amount (RED only if arrears > 0) */}
                      <td
                        className={`p-3 text-center text-sm font-bold ${
                          arrearsIsRed ? "text-red-600" : "text-gray-800"
                        }`}
                      >
                        Rs. {money(r.arrearsAmount)}
                      </td>

                      <td className="p-3 text-center text-sm">
                        Rs. {money(r.totalPaidMoney)}
                      </td>

                      {/* Pending (BLUE only if pending > 0) */}
                      <td
                        className={`p-3 text-center text-sm font-bold ${
                          pendingIsBlue ? "text-blue-700" : "text-gray-800"
                        }`}
                      >
                        Rs. {money(r.pendingPayment)}
                      </td>

                      <td className="p-3 text-center text-sm">
                        {safe(r.remainingMonths)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Status */}
        <div className="mt-2 text-[11px] text-gray-500 text-center">
          {isFetching ? "Updating..." : `Total Rows: ${rows.length}`}
        </div>

        <div className="mt-1 text-[11px] text-gray-500 text-center sm:hidden">
          Scroll left/right to view full table.
        </div>
      </div>
    </div>
  );
}
