import React, { useMemo, useState } from "react";
import {
  useGetCustomerFlowQuery,
  useLazyGetCustomerFlowByNicQuery,
} from "../api/customerpayApi";

const money = (n) => Number(n || 0).toLocaleString("en-LK");
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-LK") : "-");

const StatusPill = ({ status }) => {
  const map = {
    finished: {
      text: "Payment Finished",
      cls: "bg-green-100 text-green-800 border-green-200",
    },
    pending: {
      text: "Payment Pending",
      cls: "bg-yellow-100 text-yellow-800 border-yellow-200",
    },
    arrears: {
      text: "Payment Arrears",
      cls: "bg-red-100 text-red-800 border-red-200",
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

const ViewCustomerPage = () => {
  const [searchText, setSearchText] = useState("");

  // ✅ Modal control
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedNic, setSelectedNic] = useState("");

  // ✅ load all customer flow rows
  const { data, isLoading, isError, refetch } = useGetCustomerFlowQuery();
  const rows = data?.data || [];

  // ✅ detail (view modal)
  const [triggerDetail, detailState] = useLazyGetCustomerFlowByNicQuery();
  const detail = detailState?.data?.data || null;

  const filteredRows = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => `${r.nic} ${r.name}`.toLowerCase().includes(q));
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

        {/* SEARCH */}
        <div className="mt-5 flex flex-col sm:flex-row justify-center gap-2">
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search by Customer NIC / Name"
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

        {/* STATES */}
        {isLoading && (
          <div className="mt-6 text-center text-sm text-gray-500">Loading...</div>
        )}

        {isError && (
          <div className="mt-6 text-center text-sm text-red-600">
            Error loading customer flow. Check backend:{" "}
            <b>/api/customer/payments/customer/flow</b>
          </div>
        )}

        {/* TABLE */}
        {!isLoading && !isError && (
          <div className="mt-6 bg-white rounded-xl shadow-sm min-w-0 overflow-hidden">
            <table className="w-full table-auto">
              <thead className="hidden sm:table-header-group">
                <tr className="bg-gray-100 text-sm">
                  <th className="p-3 w-[160px]">Customer NIC</th>
                  <th className="p-3 w-[220px]">Customer Name</th>
                  <th className="p-3 w-[200px]">Total Investment</th>
                  <th className="p-3 w-[200px]">Full Pay Money</th>
                  <th className="p-3 w-[200px]">Pending Money</th>
                  <th className="p-3 w-[200px]">Arrears Money</th>
                  <th className="p-3 w-[140px]">Status</th>
                  <th className="p-3 w-[140px]">View</th>
                </tr>
              </thead>

              <tbody className="block sm:table-row-group">
                {filteredRows.map((r) => {
                  const isArrearsRow = r.status === "arrears";

                  return (
                    <tr
                      key={r.nic}
                      className={[
                        "block sm:table-row border-b sm:border-gray-200 px-2 sm:px-0",
                        isArrearsRow ? "bg-red-50" : "bg-white",
                      ].join(" ")}
                    >
                      {[
                        ["Customer NIC", r.nic || "-"],
                        ["Customer Name", r.name || "-"],
                        ["Total Investment", `Rs. ${money(r.totalInvestment)}`],
                        ["Full Pay Money", `Rs. ${money(r.fullPayMoney)}`],
                        ["Pending Money", `Rs. ${money(r.pendingMoney)}`],
                        ["Arrears Money", `Rs. ${money(r.arrearsMoney)}`],
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
                          <div className="sm:truncate sm:max-w-[220px] mx-auto">
                            {value}
                          </div>
                        </td>
                      ))}

                      <td data-label="Status" className="block sm:table-cell p-3">
                        <div className="flex justify-start sm:justify-center">
                          <StatusPill status={r.status} />
                        </div>
                      </td>

                      <td data-label="View" className="block sm:table-cell p-3">
                        <div className="flex justify-start sm:justify-center">
                          <button
                            onClick={() => openModal(r.nic)}
                            className="bg-blue-600 px-3 py-1.5 text-white text-[11px] sm:text-sm rounded-md font-bold"
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredRows.length === 0 && (
                  <tr className="block sm:table-row">
                    <td
                      className="block sm:table-cell p-6 text-center text-gray-500"
                      colSpan={8}
                    >
                      No customers found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ✅ MODAL (NO DETAILS BELOW TABLE) */}
        {modalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center px-3"
            aria-modal="true"
            role="dialog"
          >
            {/* overlay */}
            <div
              className="absolute inset-0 bg-black/40"
              onClick={closeModal}
            />

            {/* modal box */}
            <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-xl border overflow-hidden">
              {/* header */}
              <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b">
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-blue-900">
                    Customer Payment Details
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

              {/* body */}
              <div className="p-4 sm:p-6">
                {detailState.isFetching && (
                  <div className="text-center text-sm text-gray-500 font-semibold">
                    Loading details...
                  </div>
                )}

                {detailState.isError && (
                  <div className="text-sm text-red-600">
                    Failed to load card. Check backend:{" "}
                    <b>/api/customer/payments/customer/:nic/flow</b>
                  </div>
                )}

                {detail && (
                  <>
                    {/* top info */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="text-sm font-bold text-gray-800">
                        {detail.customer?.name || "-"} ({detail.customer?.nic || "-"})
                      </div>
                      <StatusPill status={detail.totals.status} />
                    </div>

                    {/* cards */}
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="rounded-xl border p-3">
                        <div className="text-[11px] text-gray-500 font-bold">
                          Total Pay Money
                        </div>
                        <div className="text-base font-extrabold text-blue-900">
                          Rs. {money(detail.totals.fullPayMoney)}
                        </div>
                      </div>

                      <div className="rounded-xl border p-3">
                        <div className="text-[11px] text-gray-500 font-bold">
                          Date Range
                        </div>
                        <div className="text-sm font-bold text-gray-900">
                          {fmtDate(detail.dateRange?.from)} -{" "}
                          {fmtDate(detail.dateRange?.to)}
                        </div>
                      </div>

                      <div className="rounded-xl border p-3">
                        <div className="text-[11px] text-gray-500 font-bold">
                          Customer Pay Money
                        </div>
                        <div className="text-base font-extrabold text-green-700">
                          Rs. {money(detail.totals.totalCustomerPayMoney)}
                        </div>
                      </div>

                      <div
                        className={`rounded-xl border p-3 ${
                          detail.totals.status === "arrears" ? "bg-red-50" : ""
                        }`}
                      >
                        <div className="text-[11px] text-gray-500 font-bold">
                          Arrears Money
                        </div>
                        <div className="text-base font-extrabold text-red-700">
                          Rs. {money(detail.totals.arrearsMoney)}
                        </div>
                      </div>

                      <div className="rounded-xl border p-3 sm:col-span-2 lg:col-span-4">
                        <div className="text-xs text-gray-600">
                          Pending Money:{" "}
                          <b>Rs. {money(detail.totals.pendingMoney)}</b> &nbsp; | &nbsp;
                          Total Investment:{" "}
                          <b>Rs. {money(detail.totals.totalInvestment)}</b>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {!detailState.isFetching && !detail && !detailState.isError && (
                  <div className="text-center text-sm text-gray-500">
                    No details to show.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewCustomerPage;
