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

const cleanText = (value) => String(value || "").toLowerCase().trim();

const formatDate = (iso) => {
  if (!iso) return "-";

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-LK", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

const statusLabel = (status) => {
  if (status === "complete") return "Complete";
  if (status === "arrears") return "Arrears";
  return "Ongoing";
};

const statusClass = (status) => {
  if (status === "complete") {
    return "bg-green-100 text-green-800 border-green-200";
  }

  if (status === "arrears") {
    return "bg-red-100 text-red-800 border-red-200";
  }

  return "bg-yellow-100 text-yellow-900 border-yellow-200";
};

export default function ViewInvestementpage() {
  const [investmentNameInput, setInvestmentNameInput] = useState("");
  const [customerInput, setCustomerInput] = useState("");
  const [brokerInput, setBrokerInput] = useState("");
  const [assetInput, setAssetInput] = useState("");
  const [paymentInput, setPaymentInput] = useState("all");

  const [filters, setFilters] = useState({
    investmentName: "",
    customer: "",
    broker: "",
    asset: "",
    payment: "all",
  });

  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [selectedInvTitle, setSelectedInvTitle] = useState("");

  const { data, isLoading, error } = useGetInvestmentsQuery();

  const [deleteInvestment, { isLoading: isDeleting }] =
    useDeleteInvestmentMutation();

  const investmentsRaw = Array.isArray(data?.data) ? data.data : [];

  const investments = useMemo(() => {
    const investmentNameSearch = cleanText(filters.investmentName);
    const customerSearch = cleanText(filters.customer);
    const brokerSearch = cleanText(filters.broker);
    const assetSearch = cleanText(filters.asset);
    const paymentSearch = filters.payment;

    return investmentsRaw.filter((investment) => {
      const customer = investment?.customerId || {};
      const broker = investment?.brokerId || {};
      const assets = Array.isArray(investment?.assetIds)
        ? investment.assetIds
        : [];

      const investmentName = cleanText(investment?.investmentName);

      const customerName = cleanText(customer?.name);
      const customerNic = cleanText(customer?.nic);

      const brokerName = cleanText(broker?.name);
      const brokerNic = cleanText(broker?.nic);

      const assetText = cleanText(
        assets
          .map(
            (asset) =>
              `${asset?.assetName || ""} ${asset?.assetType || ""} ${
                asset?.vehicleNumber || ""
              } ${asset?.landAddress || ""} ${
                asset?.assetDescription || ""
              } ${asset?.estimateAmount || ""}`
          )
          .join(" ")
      );

      const paymentStatus = investment?.paymentStatus || "ongoing";

      const matchInvestmentName =
        !investmentNameSearch ||
        investmentName.includes(investmentNameSearch);

      const matchCustomer =
        !customerSearch ||
        customerName.includes(customerSearch) ||
        customerNic.includes(customerSearch);

      const matchBroker =
        !brokerSearch ||
        brokerName.includes(brokerSearch) ||
        brokerNic.includes(brokerSearch);

      const matchAsset = !assetSearch || assetText.includes(assetSearch);

      const matchPayment =
        paymentSearch === "all" || paymentStatus === paymentSearch;

      return (
        matchInvestmentName &&
        matchCustomer &&
        matchBroker &&
        matchAsset &&
        matchPayment
      );
    });
  }, [investmentsRaw, filters]);

  const handleSearch = (e) => {
    e.preventDefault();

    setFilters({
      investmentName: investmentNameInput,
      customer: customerInput,
      broker: brokerInput,
      asset: assetInput,
      payment: paymentInput,
    });
  };

  const handleClear = () => {
    setInvestmentNameInput("");
    setCustomerInput("");
    setBrokerInput("");
    setAssetInput("");
    setPaymentInput("all");

    setFilters({
      investmentName: "",
      customer: "",
      broker: "",
      asset: "",
      payment: "all",
    });
  };

  const openAssetsModal = (investment) => {
    const assets = Array.isArray(investment?.assetIds)
      ? investment.assetIds
      : [];

    setSelectedAssets(assets);
    setSelectedInvTitle(investment?.investmentName || "Investment");
    setAssetModalOpen(true);
  };

  const closeAssetsModal = () => {
    setAssetModalOpen(false);
    setSelectedAssets([]);
    setSelectedInvTitle("");
  };

  const onDelete = async (investment) => {
    const ok = window.confirm(
      `Delete investment "${investment?.investmentName || ""}"?`
    );

    if (!ok) return;

    try {
      await deleteInvestment(investment._id).unwrap();
      alert("Deleted");
    } catch (error) {
      console.error(error);
      alert("Delete failed");
    }
  };

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-7xl px-3 sm:px-6 py-4 sm:py-6">
        <h1 className="text-2xl sm:text-3xl text-blue-800 text-center font-extrabold">
          View Investments
        </h1>

        {/* FILTER BOXES */}
        <form
          onSubmit={handleSearch}
          className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-2"
        >
          <div>
            <label className="mb-1 block text-[11px] font-bold text-gray-500">
              Investment Name
            </label>
            <input
              value={investmentNameInput}
              onChange={(e) => setInvestmentNameInput(e.target.value)}
              placeholder="Investment name"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold text-gray-500">
              Customer
            </label>
            <input
              value={customerInput}
              onChange={(e) => setCustomerInput(e.target.value)}
              placeholder="Customer NIC or Name"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold text-gray-500">
              Broker
            </label>
            <input
              value={brokerInput}
              onChange={(e) => setBrokerInput(e.target.value)}
              placeholder="Broker NIC or Name"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold text-gray-500">
              Asset
            </label>
            <input
              value={assetInput}
              onChange={(e) => setAssetInput(e.target.value)}
              placeholder="Asset name / type / number"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold text-gray-500">
              Payment
            </label>
            <select
              value={paymentInput}
              onChange={(e) => setPaymentInput(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Payments</option>
              <option value="ongoing">Ongoing</option>
              <option value="complete">Complete</option>
              <option value="arrears">Arrears</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="w-full rounded-lg bg-blue-700 px-4 py-2 text-xs sm:text-sm font-bold text-white hover:bg-blue-800 transition"
            >
              Search
            </button>

            <button
              type="button"
              onClick={handleClear}
              className="w-full rounded-lg bg-gray-200 px-4 py-2 text-xs sm:text-sm font-bold text-gray-800 hover:bg-gray-300 transition"
            >
              Clear
            </button>
          </div>
        </form>

        <div className="mt-3 text-center text-[11px] text-gray-500">
          Total: {investments.length}
        </div>

        {/* TABLE */}
        <div className="mt-5 bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <table className="w-full min-w-[1150px] table-auto">
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
                investments.map((investment) => {
                  const customer = investment?.customerId || {};
                  const broker = investment?.brokerId || {};
                  const status = investment?.paymentStatus || "ongoing";

                  return (
                    <tr key={investment._id} className="border-t text-[12px]">
                      <td className="p-2">
                        <div className="font-semibold text-gray-900">
                          {safe(investment?.investmentName)}
                        </div>
                      </td>

                      <td className="p-2">
                        <div className="text-gray-900">
                          {safe(customer?.nic)}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {safe(customer?.name)}
                        </div>
                      </td>

                      <td className="p-2">
                        <div className="text-gray-900">
                          {safe(broker?.nic)}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {safe(broker?.name)}
                        </div>
                      </td>

                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => openAssetsModal(investment)}
                          className="px-3 py-1 rounded-lg bg-blue-700 text-white text-[11px] hover:bg-blue-800"
                        >
                          View Assets
                        </button>

                        <div className="text-[10px] text-gray-500 mt-1">
                          {Array.isArray(investment?.assetIds)
                            ? investment.assetIds.length
                            : 0}{" "}
                          item(s)
                        </div>
                      </td>

                      <td className="p-2 text-right font-semibold">
                        {formatMoney(investment?.investmentAmount)}
                      </td>

                      <td className="p-2 text-center">
                        {safe(investment?.investmentInterestRate)}
                      </td>

                      <td className="p-2 text-center">
                        {safe(investment?.brokerCommissionRate)}
                      </td>

                      <td className="p-2 text-center">
                        {formatDate(investment?.startDate)}
                      </td>

                      <td className="p-2">{safe(investment?.description)}</td>

                      <td className="p-2 text-center">
                        <span
                          className={`inline-block px-2 py-1 rounded-full border text-[11px] font-bold ${statusClass(
                            status
                          )}`}
                        >
                          {statusLabel(status)}
                        </span>
                      </td>

                      <td className="p-2 text-center">
                        <button
                          type="button"
                          disabled={isDeleting}
                          onClick={() => onDelete(investment)}
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

              <div className="p-4 space-y-3 max-h-[70vh] overflow-auto">
                {selectedAssets.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    No assets
                  </div>
                ) : (
                  selectedAssets.map((asset) => (
                    <div
                      key={asset?._id}
                      className="rounded-xl border border-gray-200 bg-gray-50 p-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <div className="font-bold text-gray-900">
                            {safe(asset?.assetName)}{" "}
                            <span className="text-xs text-gray-500">
                              ({safe(asset?.assetType)})
                            </span>
                          </div>

                          <div className="text-xs text-gray-600">
                            {safe(asset?.assetDescription)}
                          </div>
                        </div>

                        <div className="text-sm font-semibold text-blue-700">
                          {formatMoney(asset?.estimateAmount)}
                        </div>
                      </div>

                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-700">
                        <div>
                          <span className="text-gray-500">Vehicle No: </span>
                          {safe(asset?.vehicleNumber)}
                        </div>

                        <div>
                          <span className="text-gray-500">Land Address: </span>
                          {safe(asset?.landAddress)}
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