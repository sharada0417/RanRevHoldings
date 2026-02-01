import React, { useMemo, useState } from "react";
import {
  useDeleteInvestmentMutation,
  useGetInvestmentsQuery,
} from "../api/investmentApi";

const formatMoney = (n) =>
  `Rs. ${Number(n || 0).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const safe = (v) => (v === undefined || v === null || v === "" ? "-" : v);

const formatDate = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-LK", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

const statusLabel = (s) => {
  if (s === "complete") return "Complete";
  if (s === "arrears") return "Arrears";
  return "Ongoing";
};

const statusClass = (s) => {
  // ✅ 3 colors
  if (s === "complete") return "bg-green-100 text-green-800 border-green-200";
  if (s === "arrears") return "bg-red-100 text-red-800 border-red-200";
  return "bg-yellow-100 text-yellow-900 border-yellow-200";
};

export default function ViewInvestementpage() {
  const [searchText, setSearchText] = useState("");
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [selectedInvTitle, setSelectedInvTitle] = useState("");

  const { data, isLoading, error } = useGetInvestmentsQuery();
  const [deleteInvestment, { isLoading: isDeleting }] =
    useDeleteInvestmentMutation();

  const investmentsRaw = Array.isArray(data?.data) ? data.data : [];

  const investments = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return investmentsRaw;

    return investmentsRaw.filter((inv) => {
      const customer = inv?.customerId || {};
      const broker = inv?.brokerId || {};
      const assets = Array.isArray(inv?.assetIds) ? inv.assetIds : [];

      const assetText = assets
        .map(
          (a) =>
            `${a?.assetName || ""} ${a?.assetType || ""} ${
              a?.vehicleNumber || ""
            } ${a?.landAddress || ""}`
        )
        .join(" ");

      const hay = [
        inv?.investmentName,
        customer?.nic,
        customer?.name,
        broker?.nic,
        broker?.name,
        assetText,
        inv?.investmentAmount,
        inv?.investmentInterestRate,
        inv?.brokerCommissionRate,
        inv?.startDate,
        inv?.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [investmentsRaw, searchText]);

  const openAssetsModal = (inv) => {
    const assets = Array.isArray(inv?.assetIds) ? inv.assetIds : [];
    setSelectedAssets(assets);
    setSelectedInvTitle(inv?.investmentName || "Investment");
    setAssetModalOpen(true);
  };

  const closeAssetsModal = () => {
    setAssetModalOpen(false);
    setSelectedAssets([]);
    setSelectedInvTitle("");
  };

  const onDelete = async (inv) => {
    const ok = window.confirm(
      `Delete investment "${inv?.investmentName || ""}" ?`
    );
    if (!ok) return;

    try {
      await deleteInvestment(inv._id).unwrap();
      alert("Deleted");
    } catch (e) {
      console.error(e);
      alert("Delete failed");
    }
  };

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-7xl px-3 sm:px-6 py-4 sm:py-6">
        <h1 className="text-2xl sm:text-3xl text-blue-800 text-center font-extrabold">
          View Investments
        </h1>

        {/* SEARCH */}
        <form
          onSubmit={(e) => e.preventDefault()}
          className="mt-5 flex flex-col sm:flex-row justify-center gap-2"
        >
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search by Investment, Customer NIC, Broker NIC, Asset..."
            className="w-full sm:w-[720px] rounded-xl border px-3 py-2 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={() => setSearchText("")}
            className="rounded-lg bg-gray-200 px-4 py-2 text-xs sm:text-sm text-gray-800"
          >
            Clear
          </button>
        </form>

        <div className="mt-2 text-center text-[11px] text-gray-500">
          Total: {investments.length}
        </div>

        {/* TABLE (NO SCROLL WRAPPER) */}
        <div className="mt-5 bg-white rounded-xl shadow-sm border border-gray-200">
          <table className="w-full table-auto">
            <thead>
              <tr className="bg-gray-100 text-[12px] text-gray-800">
                <th className="p-2 text-left">Investment</th>
                <th className="p-2 text-left">Customer NIC</th>
                <th className="p-2 text-left">Broker NIC</th>
                <th className="p-2 text-center">Assets</th>
                <th className="p-2 text-right">Amount</th>
                <th className="p-2 text-center">Interest %</th>
                <th className="p-2 text-center">Commission %</th>
                <th className="p-2 text-center">Start Date</th>
                <th className="p-2 text-left">Description</th>
                <th className="p-2 text-center">Payment</th>
                <th className="p-2 text-center">Delete</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td className="p-6 text-center text-gray-500" colSpan={11}>
                    Loading...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td className="p-6 text-center text-red-600" colSpan={11}>
                    Failed to load investments
                  </td>
                </tr>
              ) : investments.length === 0 ? (
                <tr>
                  <td className="p-6 text-center text-gray-500" colSpan={11}>
                    No investments found
                  </td>
                </tr>
              ) : (
                investments.map((inv) => {
                  const customer = inv?.customerId || {};
                  const broker = inv?.brokerId || {};
                  const status = inv?.paymentStatus || "ongoing";

                  return (
                    <tr key={inv._id} className="border-t text-[12px]">
                      <td className="p-2">
                        <div className="font-semibold text-gray-900">
                          {safe(inv?.investmentName)}
                        </div>
                      </td>

                      <td className="p-2">
                        <div className="text-gray-900">{safe(customer?.nic)}</div>
                        <div className="text-[11px] text-gray-500">
                          {safe(customer?.name)}
                        </div>
                      </td>

                      <td className="p-2">
                        <div className="text-gray-900">{safe(broker?.nic)}</div>
                        <div className="text-[11px] text-gray-500">
                          {safe(broker?.name)}
                        </div>
                      </td>

                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => openAssetsModal(inv)}
                          className="px-3 py-1 rounded-lg bg-blue-700 text-white text-[11px] hover:bg-blue-800"
                        >
                          View Assets
                        </button>
                        <div className="text-[10px] text-gray-500 mt-1">
                          {Array.isArray(inv?.assetIds) ? inv.assetIds.length : 0}{" "}
                          item(s)
                        </div>
                      </td>

                      <td className="p-2 text-right font-semibold">
                        {formatMoney(inv?.investmentAmount)}
                      </td>

                      <td className="p-2 text-center">
                        {safe(inv?.investmentInterestRate)}
                      </td>

                      <td className="p-2 text-center">
                        {safe(inv?.brokerCommissionRate)}
                      </td>

                      <td className="p-2 text-center">
                        {formatDate(inv?.startDate)}
                      </td>

                      <td className="p-2">{safe(inv?.description)}</td>

                      <td className="p-2 text-center">
                        <span
                          className={`inline-block px-2 py-1 rounded-full border text-[11px] font-bold ${statusClass(
                            status
                          )}`}
                        >
                          {statusLabel(status)}
                        </span>
                      </td>

                      {/* ✅ ONLY DELETE BUTTON */}
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          disabled={isDeleting}
                          onClick={() => onDelete(inv)}
                          className="px-3 py-1 rounded-lg bg-red-600 text-white text-[11px] hover:bg-red-700 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ASSET MODAL */}
        {assetModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
            <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl border border-gray-200">
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <div className="text-lg font-extrabold text-blue-800">
                    Assets - {safe(selectedInvTitle)}
                  </div>
                  <div className="text-xs text-gray-500">
                    Total: {selectedAssets.length}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeAssetsModal}
                  className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm"
                >
                  Close
                </button>
              </div>

              <div className="p-4 space-y-3">
                {selectedAssets.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">No assets</div>
                ) : (
                  selectedAssets.map((a) => (
                    <div
                      key={a?._id}
                      className="rounded-xl border border-gray-200 bg-gray-50 p-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <div className="font-bold text-gray-900">
                            {safe(a?.assetName)}{" "}
                            <span className="text-xs text-gray-500">
                              ({safe(a?.assetType)})
                            </span>
                          </div>
                          <div className="text-xs text-gray-600">
                            {safe(a?.assetDescription)}
                          </div>
                        </div>

                        <div className="text-sm font-semibold text-blue-700">
                          {formatMoney(a?.estimateAmount)}
                        </div>
                      </div>

                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-700">
                        <div>
                          <span className="text-gray-500">Vehicle No: </span>
                          {safe(a?.vehicleNumber)}
                        </div>
                        <div>
                          <span className="text-gray-500">Land Address: </span>
                          {safe(a?.landAddress)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
