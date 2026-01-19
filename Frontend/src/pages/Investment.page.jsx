import React, { useEffect, useMemo, useState } from "react";
import { useCreateInvestmentMutation } from "../api/investmentApi";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const InvestementPage = () => {
  // dropdown data
  const [customers, setCustomers] = useState([]);
  const [brokers, setBrokers] = useState([]);
  const [assets, setAssets] = useState([]);

  // form selections
  const [customerId, setCustomerId] = useState("");
  const [brokerId, setBrokerId] = useState("");
  const [assetId, setAssetId] = useState("");

  // user inputs
  const [investmentAmount, setInvestmentAmount] = useState("");
  const [investmentDurationMonths, setInvestmentDurationMonths] = useState("");
  const [investmentInterestRate, setInvestmentInterestRate] = useState(""); // required by backend
  const [brokerCommissionRate, setBrokerCommissionRate] = useState(""); // required by backend
  const [description, setDescription] = useState("");

  const [createInvestment, { isLoading: creating }] = useCreateInvestmentMutation();

  // load dropdown lists
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/customer`, { credentials: "include" });
        const json = await res.json();
        setCustomers(Array.isArray(json?.data) ? json.data : []);
      } catch {
        setCustomers([]);
      }
    };

    const loadBrokers = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/broker`, { credentials: "include" });
        const json = await res.json();
        setBrokers(Array.isArray(json?.data) ? json.data : []);
      } catch {
        setBrokers([]);
      }
    };

    const loadAssets = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/assets`, { credentials: "include" });
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

  // ✅ show only assets of selected customer
  const customerAssets = useMemo(() => {
    if (!customerId) return [];
    return assets.filter((a) => {
      const c = a?.customerId && typeof a.customerId === "object" ? a.customerId?._id : a?.customerId;
      return String(c || "") === String(customerId);
    });
  }, [assets, customerId]);

  const selectedAsset = useMemo(
    () => customerAssets.find((a) => a?._id === assetId) || null,
    [customerAssets, assetId]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedCustomer?.nic) return alert("Select customer");
    if (!selectedBroker?.nic) return alert("Select broker");
    if (!assetId) return alert("Select asset");

    const invAmt = Number(investmentAmount);
    const dur = Number(investmentDurationMonths);
    const intRate = Number(investmentInterestRate);
    const commRate = Number(brokerCommissionRate);

    if (!Number.isFinite(invAmt) || invAmt < 0) return alert("Invalid investment amount");
    if (!Number.isFinite(dur) || dur < 1) return alert("Invalid duration (months)");
    if (!Number.isFinite(intRate) || intRate < 0) return alert("Invalid interest rate");
    if (!Number.isFinite(commRate) || commRate < 0) return alert("Invalid broker commission");

    const payload = {
      customerNic: String(selectedCustomer.nic).trim(),
      brokerNic: String(selectedBroker.nic).trim(),
      assetId,
      investmentAmount: invAmt,
      investmentDurationMonths: dur,
      investmentInterestRate: intRate,
      brokerCommissionRate: commRate,
      description: description ? String(description).trim() : "",
    };

    try {
      const res = await createInvestment(payload).unwrap();
      if (!res?.success) return alert(res?.message || "Failed");

      alert("Investment created");

      // clear
      setCustomerId("");
      setBrokerId("");
      setAssetId("");
      setInvestmentAmount("");
      setInvestmentDurationMonths("");
      setInvestmentInterestRate("");
      setBrokerCommissionRate("");
      setDescription("");
    } catch (err) {
      alert(err?.data?.message || "Create failed");
    }
  };

  return (
    <div className="w-full min-h-screen p-4 sm:p-6">
      <div className="w-full flex justify-center">
        <div className="w-full max-w-xl bg-gray-100 rounded-2xl shadow-md p-5 sm:p-7">
          <h2 className="text-xl text-blue-800 text-center mb-4">Create Investment</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Customer */}
            <div>
              <label className="block text-black mb-1">Customer (NIC - Name)</label>
              <select
                value={customerId}
                onChange={(e) => {
                  setCustomerId(e.target.value);
                  setAssetId(""); // reset asset on customer change
                }}
                className="w-full bg-white text-gray-800 px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label className="block text-black mb-1">Broker (NIC - Name)</label>
              <select
                value={brokerId}
                onChange={(e) => setBrokerId(e.target.value)}
                className="w-full bg-white text-gray-800 px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

            {/* Asset */}
            <div>
              <label className="block text-black mb-1">Asset (Customer Assets)</label>
              <select
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                className="w-full bg-white text-gray-800 px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={!customerId}
              >
                <option value="">{customerId ? "Select Asset" : "Select customer first"}</option>
                {customerAssets.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.assetType} - {a.assetName || "Asset"} ({a.estimateAmount})
                  </option>
                ))}
              </select>
            </div>

            {/* Asset Estimate Amount (auto) */}
            <div>
              <label className="block text-black mb-1">Asset Estimate Amount</label>
              <input
                type="text"
                value={selectedAsset?.estimateAmount ?? ""}
                readOnly
                className="w-full bg-white text-gray-800 px-4 py-2 rounded-xl border border-gray-300 focus:outline-none"
                placeholder="Auto"
              />
            </div>

            {/* Investment Amount */}
            <div>
              <label className="block text-black mb-1">Investment Amount</label>
              <input
                type="number"
                value={investmentAmount}
                onChange={(e) => setInvestmentAmount(e.target.value)}
                className="w-full bg-white text-gray-800 px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                min="0"
                step="0.01"
              />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-black mb-1">Duration (Months)</label>
              <input
                type="number"
                value={investmentDurationMonths}
                onChange={(e) => setInvestmentDurationMonths(e.target.value)}
                className="w-full bg-white text-gray-800 px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                min="1"
              />
            </div>

            {/* Interest Rate (required by backend) */}
            <div>
              <label className="block text-black mb-1">Interest Rate (%)</label>
              <input
                type="number"
                value={investmentInterestRate}
                onChange={(e) => setInvestmentInterestRate(e.target.value)}
                className="w-full bg-white text-gray-800 px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                min="0"
                step="0.01"
              />
            </div>

            {/* Broker Commission Rate (required by backend) */}
            <div>
              <label className="block text-black mb-1">Broker Commission Rate (%)</label>
              <input
                type="number"
                value={brokerCommissionRate}
                onChange={(e) => setBrokerCommissionRate(e.target.value)}
                className="w-full bg-white text-gray-800 px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                min="0"
                step="0.01"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-black mb-1">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-white text-gray-800 px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Any note..."
              />
            </div>

            <button
              type="submit"
              disabled={creating}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white py-2.5 rounded-xl transition disabled:opacity-60"
            >
              {creating ? "Submitting..." : "Submit Investment"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default InvestementPage;
