import React, { useEffect, useMemo, useState } from "react";
import { useCreateInvestmentMutation } from "../api/investmentApi";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const formatMoney = (n) => {
  const x = Number(n || 0);
  if (!Number.isFinite(x)) return "-";
  return x.toLocaleString();
};

const InvestmentPage = () => {
  const [customers, setCustomers] = useState([]);
  const [brokers, setBrokers] = useState([]);
  const [assets, setAssets] = useState([]);

  const [investmentName, setInvestmentName] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [brokerId, setBrokerId] = useState("");

  // ✅ multiple assets ids
  const [selectedAssetIds, setSelectedAssetIds] = useState([]);

  // ✅ one shared amount (for all selected assets)
  const [investmentAmount, setInvestmentAmount] = useState("");
  const [investmentInterestRate, setInvestmentInterestRate] = useState("");
  const [brokerCommissionRate, setBrokerCommissionRate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [description, setDescription] = useState("");

  const [createInvestment, { isLoading: creating }] =
    useCreateInvestmentMutation();

  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/customer`, {
          credentials: "include",
        });
        const json = await res.json();
        setCustomers(Array.isArray(json?.data) ? json.data : []);
      } catch {
        setCustomers([]);
      }
    };

    const loadBrokers = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/broker`, {
          credentials: "include",
        });
        const json = await res.json();
        setBrokers(Array.isArray(json?.data) ? json.data : []);
      } catch {
        setBrokers([]);
      }
    };

    const loadAssets = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/assets`, {
          credentials: "include",
        });
        const json = await res.json();
        setAssets(Array.isArray(json?.data) ? json.data : []);
      } catch {
        setAssets([]);
      }
    };

    loadCustomers();
    loadBrokers();
    loadAssets();
  }, []);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c?._id === customerId) || null,
    [customers, customerId]
  );

  const selectedBroker = useMemo(
    () => brokers.find((b) => b?._id === brokerId) || null,
    [brokers, brokerId]
  );

  const customerAssets = useMemo(() => {
    if (!customerId) return [];
    return assets.filter((a) => {
      const c =
        a?.customerId && typeof a.customerId === "object"
          ? a.customerId?._id
          : a?.customerId;
      return String(c || "") === String(customerId);
    });
  }, [assets, customerId]);

  // ✅ when customer changes clear assets
  useEffect(() => {
    setSelectedAssetIds([]);
  }, [customerId]);

  const toggleAsset = (id) => {
    setSelectedAssetIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      return [...prev, id];
    });
  };

  const selectAllAssets = () => setSelectedAssetIds(customerAssets.map((a) => a._id));
  const clearAssets = () => setSelectedAssetIds([]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!investmentName.trim()) return alert("Enter investment name");
    if (!selectedCustomer?.nic) return alert("Select customer");
    if (!selectedBroker?.nic) return alert("Select broker");
    if (!selectedAssetIds.length) return alert("Select at least one asset");
    if (!startDate) return alert("Select start date");

    const invAmt = Number(investmentAmount);
    const intRate = Number(investmentInterestRate);
    const commRate = Number(brokerCommissionRate);

    // ✅ investment amount must be > 0
    if (!Number.isFinite(invAmt) || invAmt <= 0) return alert("Invalid investment amount");
    if (!Number.isFinite(intRate) || intRate < 0) return alert("Invalid interest rate");
    if (!Number.isFinite(commRate) || commRate < 0) return alert("Invalid broker commission");

    // ✅ IMPORTANT:
    // ONE investment document + assetIds array
    const payload = {
      investmentName: investmentName.trim(),
      customerNic: String(selectedCustomer.nic).trim(),
      brokerNic: String(selectedBroker.nic).trim(),
      assetIds: selectedAssetIds, // ✅ array
      investmentAmount: invAmt, // ✅ one amount for whole investment
      investmentInterestRate: intRate,
      brokerCommissionRate: commRate,
      startDate, // YYYY-MM-DD
      description: description ? description.trim() : "",
    };

    try {
      const res = await createInvestment(payload).unwrap();
      if (!res?.success) return alert(res?.message || "Failed");

      // ✅ because now only ONE investment will be created
      alert("Investment created successfully");

      // clear
      setInvestmentName("");
      setCustomerId("");
      setBrokerId("");
      setSelectedAssetIds([]);
      setInvestmentAmount("");
      setInvestmentInterestRate("");
      setBrokerCommissionRate("");
      setStartDate("");
      setDescription("");
    } catch (err) {
      alert(err?.data?.message || "Create failed");
    }
  };

  // ✅ live preview calculations (frontend only)
  const previewInterest = useMemo(() => {
    const a = Number(investmentAmount || 0);
    const r = Number(investmentInterestRate || 0);
    if (!Number.isFinite(a) || !Number.isFinite(r)) return 0;
    return (a * r) / 100;
  }, [investmentAmount, investmentInterestRate]);

  const previewCommission = useMemo(() => {
    const interest = Number(previewInterest || 0);
    const r = Number(brokerCommissionRate || 0);
    if (!Number.isFinite(interest) || !Number.isFinite(r)) return 0;
    return (interest * r) / 100;
  }, [previewInterest, brokerCommissionRate]);

  return (
    <div className="w-full min-h-screen bg-[#ffffff]">
      <div className="w-full flex justify-center px-3 sm:px-6 py-6">
        <div className="w-full max-w-6xl min-w-0">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-blue-800 text-center">
            Investment
          </h1>

          <div className="mt-6 flex justify-center">
            <div className="w-full max-w-2xl bg-gray-200 rounded-2xl shadow-md border border-gray-300 p-5 sm:p-7">
              <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 text-center mb-5">
                Create Investment
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* ✅ Investment Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Investment Name
                  </label>
                  <input
                    value={investmentName}
                    onChange={(e) => setInvestmentName(e.target.value)}
                    className="w-full bg-white text-gray-800 px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ex: Sun Loan 01"
                    required
                  />
                </div>

                {/* Customer */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Customer (NIC - Name)
                  </label>
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="w-full bg-white text-gray-800 px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Customer</option>
                    {customers.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.nic} - {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Broker */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Broker (NIC - Name)
                  </label>
                  <select
                    value={brokerId}
                    onChange={(e) => setBrokerId(e.target.value)}
                    className="w-full bg-white text-gray-800 px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Broker</option>
                    {brokers.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.nic} - {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Assets */}
                <div className="rounded-2xl border border-gray-300 bg-white p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-extrabold text-gray-800">
                        Assets (Customer Assets)
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        Select assets (multiple).
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={selectAllAssets}
                        disabled={!customerId || customerAssets.length === 0}
                        className="rounded-lg bg-gray-100 border border-gray-200 px-3 py-2 text-xs hover:bg-gray-200 disabled:opacity-60"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={clearAssets}
                        className="rounded-lg bg-gray-100 border border-gray-200 px-3 py-2 text-xs hover:bg-gray-200"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    {!customerId ? (
                      <div className="text-sm text-gray-500">Select customer first.</div>
                    ) : customerAssets.length === 0 ? (
                      <div className="text-sm text-gray-500">No assets for this customer.</div>
                    ) : (
                      customerAssets.map((a) => (
                        <label
                          key={a._id}
                          className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-3 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedAssetIds.includes(a._id)}
                            onChange={() => toggleAsset(a._id)}
                            className="mt-1"
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-gray-900 break-words">
                              {a.assetName || "Asset"}{" "}
                              <span className="text-xs font-normal text-gray-500">
                                ({a.assetType})
                              </span>
                            </div>
                            <div className="text-xs text-gray-600 break-words">
                              Estimate: {formatMoney(a.estimateAmount)}
                            </div>
                          </div>
                        </label>
                      ))
                    )}
                  </div>

                  <div className="mt-3 text-xs text-gray-700">
                    Selected: <b>{selectedAssetIds.length}</b>
                  </div>
                </div>

                {/* Amount + Rates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Investment Amount (One Amount)
                    </label>
                    <input
                      type="number"
                      value={investmentAmount}
                      onChange={(e) => setInvestmentAmount(e.target.value)}
                      className="w-full bg-white text-gray-800 px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Interest Rate (%)
                    </label>
                    <input
                      type="number"
                      value={investmentInterestRate}
                      onChange={(e) => setInvestmentInterestRate(e.target.value)}
                      className="w-full bg-white text-gray-800 px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Broker Commission Rate (%)
                    </label>
                    <input
                      type="number"
                      value={brokerCommissionRate}
                      onChange={(e) => setBrokerCommissionRate(e.target.value)}
                      className="w-full bg-white text-gray-800 px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                      min="0"
                      step="0.01"
                    />
                  </div>

                  {/* Calendar */}
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Interest & Commission Calculate Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-white text-gray-800 px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <div className="text-[11px] text-gray-600 mt-1">
                      Preview Interest: <b>{formatMoney(previewInterest)}</b> | Preview Commission:{" "}
                      <b>{formatMoney(previewCommission)}</b>
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-white text-gray-800 px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Any note..."
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={creating}
                  className="w-full bg-blue-700 hover:bg-blue-800 text-white py-2.5 rounded-xl transition disabled:opacity-60 font-bold"
                >
                  {creating ? "Submitting..." : "Submit Investment"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvestmentPage;
