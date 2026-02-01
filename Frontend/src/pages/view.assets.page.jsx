import React, { useMemo, useState } from "react";
import { useGetAssetFlowQuery } from "../api/assetApi";

const money = (n) => Number(n || 0).toLocaleString("en-LK");

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

const ViewAssetpage = () => {
  const [searchText, setSearchText] = useState("");
  const [arrearsDays, setArrearsDays] = useState(30);

  const { data, isLoading, isError, refetch } =
    useGetAssetFlowQuery(arrearsDays);

  const rows = data?.data || [];

  const filteredRows = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((r) => {
      const assetStr = `${r?.assetName || ""}`;
      const customerStr = `${r?.customer?.nic || ""} ${r?.customer?.name || ""}`;
      const brokerStr = `${r?.broker?.nic || ""} ${r?.broker?.name || ""}`;
      const moneyStr = `${r?.estimateAmount || ""} ${r?.investmentAmount || ""} ${
        r?.totalCustomerPaid || ""
      }`;

      return `${assetStr} ${customerStr} ${brokerStr} ${moneyStr}`
        .toLowerCase()
        .includes(q);
    });
  }, [rows, searchText]);

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-7xl px-3 sm:px-6 py-4 sm:py-6 min-w-0">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-blue-800 text-center">
          View Assets
        </h1>

        {/* SEARCH + ARREARS DAYS */}
        <div className="mt-5 flex flex-col lg:flex-row justify-center items-stretch lg:items-center gap-2">
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search by Asset / Customer NIC / Customer Name / Broker NIC / Broker Name"
            className="w-full lg:w-[620px] rounded-xl border px-3 py-2 text-xs sm:text-sm"
          />

          <div className="flex gap-2">
            <select
              value={arrearsDays}
              onChange={(e) => setArrearsDays(Number(e.target.value))}
              className="rounded-xl border px-3 py-2 text-xs sm:text-sm"
              title="Arrears threshold"
            >
              <option value={15}>Arrears: 15 days</option>
              <option value={30}>Arrears: 30 days</option>
              <option value={45}>Arrears: 45 days</option>
              <option value={60}>Arrears: 60 days</option>
            </select>

            <button
              onClick={() => refetch()}
              className="rounded-lg bg-blue-700 px-4 py-2 text-xs sm:text-sm font-bold text-white"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* STATES */}
        {isLoading && (
          <div className="mt-6 text-center text-sm text-gray-500">Loading...</div>
        )}

        {isError && (
          <div className="mt-6 text-center text-sm text-red-600">
            Error loading Asset Flow. Check backend: <b>/api/assets/flow</b>
          </div>
        )}

        {/* TABLE */}
        {!isLoading && !isError && (
          <div className="mt-6 bg-white rounded-xl shadow-sm min-w-0 overflow-hidden">
            <table className="w-full table-auto">
              <thead className="hidden sm:table-header-group">
                <tr className="bg-gray-100 text-sm">
                  <th className="p-3">Asset Name</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Broker</th>
                  <th className="p-3">Estimate Amount</th>
                  <th className="p-3">Invest Amount</th>
                  <th className="p-3">Total Customer Pay</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>

              <tbody className="block sm:table-row-group">
                {filteredRows.map((r) => {
                  const isArrears = r.paymentStatus === "arrears";

                  return (
                    <tr
                      key={r._id}
                      className={[
                        "block sm:table-row border-b sm:border-gray-200 px-2 sm:px-0",
                        isArrears ? "bg-red-50" : "bg-white",
                      ].join(" ")}
                    >
                      {[
                        ["Asset Name", r.assetName || "-"],
                        [
                          "Customer",
                          <div className="leading-tight" key="customer">
                            <div className="font-semibold">
                              {r?.customer?.name || "-"}
                            </div>
                            <div className="text-[11px] text-gray-500">
                              {r?.customer?.nic || "-"}
                            </div>
                          </div>,
                        ],
                        [
                          "Broker",
                          <div className="leading-tight" key="broker">
                            <div className="font-semibold">
                              {r?.broker?.name || "-"}
                            </div>
                            <div className="text-[11px] text-gray-500">
                              {r?.broker?.nic || "-"}
                            </div>
                          </div>,
                        ],
                        ["Estimate Amount", `Rs. ${money(r.estimateAmount)}`],
                        ["Invest Amount", `Rs. ${money(r.investmentAmount)}`],
                        ["Total Customer Pay", `Rs. ${money(r.totalCustomerPaid)}`],
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
                          <StatusPill status={r.paymentStatus} />
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredRows.length === 0 && (
                  <tr className="block sm:table-row">
                    <td
                      className="block sm:table-cell p-6 text-center text-gray-500"
                      colSpan={7}
                    >
                      No assets found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && !isError && (
          <div className="mt-4 text-xs text-gray-500 text-center">
            Arrears rule: Customer pending &gt; 0 and last payment older than selected days (or no
            payment yet).
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewAssetpage;
