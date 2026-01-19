// pages/BrokerPaymantPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  setBrokerSelectMode,
  setSelectedBroker,
  setSelectedAssetId,
  setSelectedInvestmentId,
  resetBrokerPay,
} from "../api/features/brokerpaySlice";

import {
  useLazyGetBrokerSummaryByNicQuery,
  useCreateBrokerPaymentMutation,
} from "../api/brokerpayApi";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const money = (n) =>
  `Rs. ${Number(n || 0).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const safe = (v) => (v === undefined || v === null || v === "" ? "-" : v);

export default function BrokerPaymantPage() {
  const dispatch = useDispatch();
  const { brokerSelectMode, selectedBrokerNic, selectedAssetId, selectedInvestmentId } =
    useSelector((s) => s.brokerPay);

  const [brokers, setBrokers] = useState([]);
  const [loadingBrokers, setLoadingBrokers] = useState(false);

  const [payAmount, setPayAmount] = useState("");
  const [note, setNote] = useState("");

  const [loadSummary, { data: summaryRes, isFetching: fetchingSummary, error: summaryErr }] =
    useLazyGetBrokerSummaryByNicQuery();

  const [createPay, { isLoading: paying }] = useCreateBrokerPaymentMutation();

  // ✅ Load brokers list
  useEffect(() => {
    const load = async () => {
      try {
        setLoadingBrokers(true);
        const res = await fetch(`${BACKEND_URL}/api/broker`, {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        const json = await res.json();
        setBrokers(Array.isArray(json?.data) ? json.data : []);
      } catch {
        setBrokers([]);
      } finally {
        setLoadingBrokers(false);
      }
    };
    load();
  }, []);

  const summary = summaryRes || null;
  const investments = summary?.investments || [];
  const brokerObj = summary?.broker || null;

  // ✅ Group assets from investments
  const assets = useMemo(() => {
    const map = new Map();
    for (const inv of investments) {
      const a = inv?.asset;
      if (!a?._id) continue;
      if (!map.has(a._id)) {
        map.set(a._id, {
          _id: a._id,
          assetName: a.assetName,
          assetType: a.assetType,
          vehicleNumber: a.vehicleNumber,
          landAddress: a.landAddress,
          estimateAmount: a.estimateAmount,
        });
      }
    }
    return Array.from(map.values());
  }, [investments]);

  // ✅ investments for selected asset
  const assetInvestments = useMemo(() => {
    if (!selectedAssetId) return [];
    return investments.filter((inv) => String(inv?.asset?._id) === String(selectedAssetId));
  }, [investments, selectedAssetId]);

  // ✅ PAYABLE NOW investments only
  const payableNowInvestments = useMemo(() => {
    return assetInvestments.filter((inv) => Number(inv?.nowPayable || 0) > 0);
  }, [assetInvestments]);

  // ✅ Asset payable now = sum of nowPayable
  const assetNowPayable = useMemo(() => {
    return payableNowInvestments.reduce((sum, inv) => sum + Number(inv.nowPayable || 0), 0);
  }, [payableNowInvestments]);

  // ✅ selected investment object
  const selectedInvestmentObj = useMemo(() => {
    if (!selectedInvestmentId) return null;
    return (
      payableNowInvestments.find((x) => String(x.investmentId) === String(selectedInvestmentId)) ||
      null
    );
  }, [payableNowInvestments, selectedInvestmentId]);

  const currentNowPayable = selectedInvestmentObj
    ? Number(selectedInvestmentObj.nowPayable || 0)
    : assetNowPayable;

  // ✅ when broker selected -> load summary
  useEffect(() => {
    if (!selectedBrokerNic) return;
    loadSummary(selectedBrokerNic);
  }, [selectedBrokerNic, loadSummary]);

  const handleBrokerChange = (brokerNic) => {
    const b = brokers.find(
      (x) => String(x.nic).toUpperCase() === String(brokerNic).toUpperCase()
    );
    dispatch(
      setSelectedBroker({
        brokerNic: b?.nic || "",
        brokerId: b?._id || null,
      })
    );
  };

  // ✅ if selectedInvestmentId is not payable anymore after refresh, clear it
  useEffect(() => {
    if (!selectedInvestmentId) return;
    const exists = payableNowInvestments.some(
      (x) => String(x.investmentId) === String(selectedInvestmentId)
    );
    if (!exists) dispatch(setSelectedInvestmentId(null));
  }, [payableNowInvestments, selectedInvestmentId, dispatch]);

  const submitPayment = async (e) => {
    e.preventDefault();

    if (!selectedBrokerNic) return alert("Select broker");
    if (!selectedAssetId) return alert("Select asset");

    const payTargetInvestment =
      selectedInvestmentObj?.investmentId || payableNowInvestments?.[0]?.investmentId;

    if (!payTargetInvestment) {
      return alert("No payable commission found (nowPayable = 0).");
    }

    const amount = Number(payAmount);
    if (!Number.isFinite(amount) || amount <= 0) return alert("Enter valid amount");

    const limit = Number(currentNowPayable || 0);
    if (limit > 0 && amount > limit) {
      return alert(`Pay amount cannot be higher than payable now (${money(limit)})`);
    }

    try {
      const res = await createPay({
        brokerNic: selectedBrokerNic,
        investmentId: payTargetInvestment,
        payAmount: amount,
        note,
      }).unwrap();

      if (res?.success) {
        alert("Broker payment recorded");
        setPayAmount("");
        setNote("");
        await loadSummary(selectedBrokerNic).unwrap();
      } else {
        alert(res?.message || "Payment failed");
      }
    } catch (err) {
      alert(err?.data?.message || "Payment failed");
    }
  };

  const selectedAssetObj = useMemo(() => {
    if (!selectedAssetId) return null;
    return assets.find((a) => String(a._id) === String(selectedAssetId)) || null;
  }, [assets, selectedAssetId]);

  return (
    <div className="w-full min-h-screen p-4 sm:p-6 md:p-10">
      <h1 className="text-center text-blue-800 text-2xl sm:text-3xl md:text-4xl font-extrabold mb-6">
        Broker Payment
      </h1>

      <div className="w-full flex justify-center">
        <div className="w-full max-w-xl bg-gray-100 rounded-2xl shadow-md p-5 sm:p-7">
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => dispatch(resetBrokerPay())}
              className="rounded-xl bg-white px-4 py-2 text-sm text-gray-800 hover:bg-gray-200 transition"
            >
              Reset
            </button>
          </div>

          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => dispatch(setBrokerSelectMode("nic"))}
              className={`rounded-xl px-4 py-2 text-sm border ${
                brokerSelectMode === "nic" ? "bg-blue-50 border-blue-300" : "bg-white"
              }`}
            >
              Select by NIC
            </button>
            <button
              type="button"
              onClick={() => dispatch(setBrokerSelectMode("name"))}
              className={`rounded-xl px-4 py-2 text-sm border ${
                brokerSelectMode === "name" ? "bg-blue-50 border-blue-300" : "bg-white"
              }`}
            >
              Select by Name
            </button>
          </div>

          <div className="mb-4">
            <label className="block text-black font-semibold mb-1">
              Broker {brokerSelectMode === "nic" ? "NIC" : "Name"}
            </label>

            <select
              value={selectedBrokerNic || ""}
              onChange={(e) => handleBrokerChange(e.target.value)}
              className="w-full bg-white text-gray-800 px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={loadingBrokers}
            >
              <option value="">{loadingBrokers ? "Loading brokers..." : "Select Broker"}</option>
              {brokers.map((b) => (
                <option key={b._id} value={b.nic}>
                  {brokerSelectMode === "nic"
                    ? `${safe(b.nic)} - ${safe(b.name)}`
                    : `${safe(b.name)} - ${safe(b.nic)}`}
                </option>
              ))}
            </select>

            <div className="mt-2 text-xs text-gray-600">
              Broker Name: <span className="font-semibold">{safe(brokerObj?.name)}</span>
              <br />
              Broker NIC: <span className="font-semibold">{safe(brokerObj?.nic)}</span>
            </div>

            {summaryErr ? (
              <div className="mt-2 text-xs text-red-600">Failed to load broker summary</div>
            ) : null}
          </div>

          <div className="mb-4">
            <label className="block text-black font-semibold mb-1">Asset</label>
            <select
              value={selectedAssetId || ""}
              onChange={(e) => dispatch(setSelectedAssetId(e.target.value))}
              className="w-full bg-white text-gray-800 px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={!selectedBrokerNic || fetchingSummary}
            >
              <option value="">
                {!selectedBrokerNic
                  ? "Select Broker first"
                  : fetchingSummary
                  ? "Loading assets..."
                  : "Select Asset"}
              </option>

              {assets.map((a) => (
                <option key={a._id} value={a._id}>
                  {safe(a.assetName)} - {safe(a.assetType)}
                </option>
              ))}
            </select>

            <div className="mt-2 text-xs text-gray-600">
              Asset Type: <span className="font-semibold">{safe(selectedAssetObj?.assetType)}</span>
              <br />
              Asset Name: <span className="font-semibold">{safe(selectedAssetObj?.assetName)}</span>
              <br />
              Estimate: <span className="font-semibold">{money(selectedAssetObj?.estimateAmount)}</span>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-black font-semibold mb-1">
              Pay For Investment (Optional)
            </label>

            <select
              value={selectedInvestmentId || ""}
              onChange={(e) => dispatch(setSelectedInvestmentId(e.target.value))}
              className="w-full bg-white text-gray-800 px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!selectedAssetId}
            >
              <option value="">Auto (pay first payable investment)</option>

              {payableNowInvestments.map((inv) => (
                <option key={inv.investmentId} value={inv.investmentId}>
                  {`ID: ${String(inv.investmentId).slice(-6)} | NOW: ${money(inv.nowPayable)} | Remaining: ${money(
                    inv.brokerPendingAmount
                  )} | Customer: ${safe(inv.customer?.name)}`}
                </option>
              ))}
            </select>

            {!!selectedAssetId && assetInvestments.length > 0 && payableNowInvestments.length === 0 ? (
              <div className="mt-2 text-xs text-red-600 font-semibold">
                No payable commission now. (nowPayable = 0)
              </div>
            ) : null}
          </div>

          <div className="mb-4">
            <label className="block text-black font-semibold mb-1">Payable Now</label>
            <input
              type="text"
              value={money(currentNowPayable)}
              readOnly
              className="w-full bg-white text-gray-800 px-4 py-2 rounded-xl border border-gray-300 focus:outline-none"
            />
            <div className="mt-1 text-[11px] text-gray-600">
              * Payable now is calculated from customer paid amount (monthly unlock).
            </div>
          </div>

          <form onSubmit={submitPayment} className="space-y-4">
            <div>
              <label className="block text-black font-semibold mb-1">Pay Amount</label>
              <input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="Enter pay amount"
                className="w-full bg-white text-gray-800 px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                min="0"
                step="0.01"
              />
              {currentNowPayable && payAmount && Number(payAmount) > Number(currentNowPayable) ? (
                <p className="mt-1 text-xs text-red-600 font-semibold">
                  Pay amount cannot be higher than payable now
                </p>
              ) : null}
            </div>

            <div>
              <label className="block text-black font-semibold mb-1">Note</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note..."
                className="w-full bg-white text-gray-800 px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-2.5 rounded-xl transition"
              disabled={
                !selectedBrokerNic ||
                !selectedAssetId ||
                !payAmount ||
                Number(currentNowPayable || 0) <= 0 ||
                (currentNowPayable && Number(payAmount) > Number(currentNowPayable)) ||
                paying
              }
            >
              {paying ? "Saving..." : "Submit Broker Payment"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
