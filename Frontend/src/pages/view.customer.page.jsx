import React, { useMemo, useState } from "react";
import {
  useGetCustomerFlowQuery,
  useLazyGetCustomerFlowByNicQuery,
} from "../api/customerpayApi";

const money = (n) => `Rs. ${Number(n || 0).toLocaleString("en-LK")}`;
const safe = (v) => (v === undefined || v === null || v === "" ? "-" : v);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-LK") : "-");

const LiveDots = () => (
  <span className="inline-flex items-center gap-2">
    <span className="text-[11px] font-extrabold text-red-700">LIVE</span>
    <span className="inline-flex gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-bounce" />
      <span
        className="w-1.5 h-1.5 rounded-full bg-red-600 animate-bounce"
        style={{ animationDelay: "120ms" }}
      />
      <span
        className="w-1.5 h-1.5 rounded-full bg-red-600 animate-bounce"
        style={{ animationDelay: "240ms" }}
      />
    </span>
  </span>
);

const StatusPill = ({ status }) => {
  const map = {
    complete: { text: "Complete", cls: "bg-green-100 text-green-800 border-green-200" },
    pending: { text: "Pending", cls: "bg-yellow-100 text-yellow-800 border-yellow-200" },
    arrears: { text: "Arrears", cls: "bg-red-100 text-red-800 border-red-200" },
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

export default function ViewCustomerPage() {
  const [searchText, setSearchText] = useState("");

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedNic, setSelectedNic] = useState("");

  // list
  const { data, isLoading, isError, refetch, isFetching } = useGetCustomerFlowQuery();
  const rows = Array.isArray(data?.data) ? data.data : [];

  // detail
  const [triggerDetail, detailState] = useLazyGetCustomerFlowByNicQuery();
  const detail = detailState?.data?.data || null;

  const filteredRows = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      `${r.nic || ""} ${r.name || ""} ${r.tpNumber || ""}`.toLowerCase().includes(q)
    );
  }, [rows, searchText]);

  const openModal = async (nic) => {
    const n = String(nic || "").trim().toUpperCase();
    setSelectedNic(n);
    setModalOpen(true);
    await triggerDetail(n);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedNic("");
  };

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-6xl px-3 sm:px-6 py-4 sm:py-6 min-w-0">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-blue-800 text-center">
          View Customers Flow
        </h1>

        <div className="mt-5 flex flex-col sm:flex-row justify-center gap-2">
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search by Customer NIC / Name / TP"
            className="w-full sm:w-[420px] rounded-xl border px-3 py-2 text-xs sm:text-sm"
          />
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-lg bg-blue-700 px-4 py-2 text-xs sm:text-sm font-bold text-white"
          >
            Refresh
          </button>
        </div>

        <div className="mt-2 text-center text-[11px] text-gray-500">
          {isFetching ? "Updating..." : `Total: ${filteredRows.length}`}
        </div>

        {isLoading && (
          <div className="mt-6 text-center text-sm text-gray-500">Loading...</div>
        )}

        {isError && (
          <div className="mt-6 text-center text-sm text-red-600">
            Error loading customer flow. Check backend:{" "}
            <b>/api/customer/payments/customer/flow</b>
          </div>
        )}

        {/* TABLE - same sizing */}
        {!isLoading && !isError && (
          <div className="mt-6 bg-white rounded-xl shadow-sm min-w-0 overflow-hidden">
            <table className="w-full table-auto">
              <thead className="hidden sm:table-header-group">
                <tr className="bg-gray-100 text-sm">
                  <th className="p-3 w-[160px]">Customer NIC</th>
                  <th className="p-3 w-[220px]">Customer Name</th>
                  <th className="p-3 w-[170px]">TP Number</th>
                  <th className="p-3 w-[240px]">Total Customer Paid (Until Now)</th>
                  <th className="p-3 w-[200px]">Arrears Amount</th>
                  <th className="p-3 w-[170px]">Arrears Months</th>
                  <th className="p-3 w-[140px]">Status</th>
                  <th className="p-3 w-[140px]">Details</th>
                </tr>
              </thead>

              <tbody className="block sm:table-row-group">
                {filteredRows.map((r) => {
                  const isArrearsRow = r.status === "arrears";

                  return (
                    <tr
                      key={r.customerId || r.nic || Math.random()}
                      className={[
                        "block sm:table-row border-b sm:border-gray-200 px-2 sm:px-0",
                        isArrearsRow ? "bg-red-50" : "bg-white",
                      ].join(" ")}
                    >
                      {[
                        ["Customer NIC", safe(r.nic)],
                        ["Customer Name", safe(r.name)],
                        ["TP Number", safe(r.tpNumber)],
                        ["Total Customer Paid (Until Now)", money(r.totalCustomerPay)],
                        ["Arrears Amount", money(r.arrearsAmount)],
                        ["Arrears Months", safe(r.arrearsMonthsCount)],
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
                        <div className="flex justify-start sm:justify-center items-center gap-2">
                          <StatusPill status={r.status} />
                          {r.status === "arrears" ? <LiveDots /> : null}
                        </div>
                      </td>

                      <td data-label="Details" className="block sm:table-cell p-3">
                        <div className="flex justify-start sm:justify-center">
                          <button
                            onClick={() => openModal(r.nic)}
                            className="bg-blue-600 px-3 py-1.5 text-white text-[11px] sm:text-sm rounded-md font-bold"
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredRows.length === 0 && (
                  <tr className="block sm:table-row">
                    <td className="block sm:table-cell p-6 text-center text-gray-500" colSpan={8}>
                      No customers found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-3">
            <div className="absolute inset-0 bg-black/40" onClick={closeModal} />

            <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-xl border overflow-hidden">
              <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b">
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-blue-900">
                    Customer Arrears Details
                  </h2>
                  <div className="text-xs sm:text-sm text-gray-600 mt-1">
                    Selected NIC: <b>{selectedNic || "-"}</b>
                  </div>
                </div>

                <button
                  onClick={closeModal}
                  className="rounded-lg border px-3 py-1.5 text-sm font-bold text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>

              <div className="p-4 sm:p-6">
                {detailState.isFetching && (
                  <div className="text-center text-sm text-gray-500 font-semibold">
                    Loading details...
                  </div>
                )}

                {detailState.isError && (
                  <div className="text-sm text-red-600">
                    Failed to load details. Check backend:{" "}
                    <b>/api/customer/payments/customer/:nic/flow</b>
                  </div>
                )}

                {detail && (
                  <>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="text-sm font-bold text-gray-800">
                        {safe(detail.customer?.name)} ({safe(detail.customer?.nic)}) —{" "}
                        {safe(detail.customer?.tpNumber)}
                      </div>

                      <div className="flex items-center gap-2">
                        <StatusPill status={detail.totals?.status} />
                        {detail.totals?.status === "arrears" ? <LiveDots /> : null}
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="rounded-xl border p-3">
                        <div className="text-[11px] text-gray-500 font-bold">
                          Total Customer Paid (Until Now)
                        </div>
                        <div className="text-base font-extrabold text-blue-900">
                          {money(detail.totals?.totalCustomerPay)}
                        </div>
                      </div>

                      <div className="rounded-xl border p-3">
                        <div className="text-[11px] text-gray-500 font-bold">
                          Arrears Amount
                        </div>
                        <div className="text-base font-extrabold text-red-700">
                          {money(detail.totals?.arrearsAmount)}
                        </div>
                      </div>

                      <div className="rounded-xl border p-3">
                        <div className="text-[11px] text-gray-500 font-bold">
                          Arrears Months
                        </div>
                        <div className="text-base font-extrabold text-gray-900">
                          {safe(detail.totals?.arrearsMonthsCount)}
                        </div>
                      </div>

                      <div className="rounded-xl border p-3">
                        <div className="text-[11px] text-gray-500 font-bold">Date Range</div>
                        <div className="text-sm font-bold text-gray-900">
                          {fmtDate(detail.dateRange?.from)} - {fmtDate(detail.dateRange?.to)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6">
                      <div className="text-sm font-extrabold text-gray-900 mb-2">
                        Arrears Investments ({detail.arrearsInvestments?.length || 0})
                      </div>

                      {Array.isArray(detail.arrearsInvestments) &&
                      detail.arrearsInvestments.length > 0 ? (
                        <div className="space-y-3">
                          {detail.arrearsInvestments.map((inv) => (
                            <div
                              key={inv._id}
                              className="rounded-2xl border border-red-200 bg-red-50 p-4"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div>
                                  <div className="font-extrabold text-gray-900">
                                    {safe(inv.investmentName)}
                                  </div>
                                  <div className="text-xs text-gray-600 mt-0.5">
                                    Start Date: <b>{fmtDate(inv.startDate)}</b> | Due Months:{" "}
                                    <b>{safe(inv.dueMonths)}</b>
                                  </div>
                                </div>

                                <div className="text-sm font-extrabold text-red-700">
                                  Arrears: {money(inv.arrearsInterest)}
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3 text-sm">
                                <div className="rounded-xl bg-white border p-3">
                                  <div className="text-[11px] text-gray-500 font-bold">
                                    Investment Amount
                                  </div>
                                  <div className="font-extrabold text-gray-900">
                                    {money(inv.investmentAmount)}
                                  </div>
                                </div>

                                <div className="rounded-xl bg-white border p-3">
                                  <div className="text-[11px] text-gray-500 font-bold">
                                    Monthly Interest
                                  </div>
                                  <div className="font-extrabold text-gray-900">
                                    {money(inv.monthlyInterest)}
                                  </div>
                                </div>

                                <div className="rounded-xl bg-white border p-3">
                                  <div className="text-[11px] text-gray-500 font-bold">
                                    Interest Paid
                                  </div>
                                  <div className="font-extrabold text-gray-900">
                                    {money(inv.interestPaidAmount)}
                                  </div>
                                </div>

                                <div className="rounded-xl bg-white border p-3">
                                  <div className="text-[11px] text-gray-500 font-bold">
                                    Principal Pending
                                  </div>
                                  <div className="font-extrabold text-gray-900">
                                    {money(inv.principalPending)}
                                  </div>
                                </div>
                              </div>

                              <div className="mt-3 rounded-xl bg-white border p-3">
                                <div className="text-[11px] text-gray-500 font-bold">
                                  Broker
                                </div>
                                <div className="text-sm font-bold text-gray-900">
                                  {safe(inv.broker?.name)} ({safe(inv.broker?.nic)})
                                </div>
                              </div>

                              <div className="mt-3 rounded-xl bg-white border p-3">
                                <div className="text-[11px] text-gray-500 font-bold">
                                  Assets
                                </div>

                                {Array.isArray(inv.assets) && inv.assets.length > 0 ? (
                                  <ul className="mt-2 space-y-1 text-sm">
                                    {inv.assets.map((a) => (
                                      <li key={a._id} className="flex flex-col">
                                        <span className="font-bold text-gray-900">
                                          {safe(a.assetName)}{" "}
                                          <span className="text-[11px] text-gray-600 font-semibold">
                                            ({safe(a.assetType)})
                                          </span>
                                        </span>
                                        <span className="text-[12px] text-gray-700">
                                          Vehicle: {safe(a.vehicleNumber)} | Land:{" "}
                                          {safe(a.landAddress)} | Estimate:{" "}
                                          {money(a.estimateAmount)}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <div className="text-sm text-gray-600 mt-1">No assets</div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-600">
                          No arrears investments for this customer.
                        </div>
                      )}
                    </div>
                  </>
                )}

                {!detailState.isFetching && !detail && !detailState.isError && (
                  <div className="text-center text-sm text-gray-500">No details to show.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
