import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  setBrokerSelectMode,
  setSelectedBroker,
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
  const { brokerSelectMode, selectedBrokerNic } = useSelector((s) => s.brokerPay);

  const [brokers, setBrokers] = useState([]);
  const [loadingBrokers, setLoadingBrokers] = useState(false);

  const [payAmount, setPayAmount] = useState("");
  const [note, setNote] = useState("");

  const [loadSummary, { data: summaryRes, isFetching: fetchingSummary, error: summaryErr }] =
    useLazyGetBrokerSummaryByNicQuery();

  const [createPay, { isLoading: paying }] = useCreateBrokerPaymentMutation();

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingBrokers(true);
        const res = await fetch(`${BACKEND_URL}/api/broker`, { credentials: "include" });
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

  useEffect(() => {
    if (!selectedBrokerNic) return;
    loadSummary(selectedBrokerNic);
  }, [selectedBrokerNic, loadSummary]);

  const brokerObj = summaryRes?.broker || null;
  const pending = Number(summaryRes?.totalPendingCommission || 0);

  const handleBrokerChange = (brokerNic) => {
    const b = brokers.find(
      (x) => String(x.nic).toUpperCase() === String(brokerNic).toUpperCase()
    );
    dispatch(setSelectedBroker({ brokerNic: b?.nic || "", brokerId: b?._id || null }));
  };

  const payMax = useMemo(() => pending, [pending]);

  const submitPayment = async (e) => {
    e.preventDefault();

    if (!selectedBrokerNic) return alert("Select broker");

    const amount = Number(payAmount);
    if (!Number.isFinite(amount) || amount <= 0) return alert("Enter valid amount");

    if (pending <= 0) return alert("No pending commission right now");
    if (amount > pending) return alert(`Pay amount cannot be higher than pending (${money(pending)})`);

    try {
      const res = await createPay({
        brokerNic: selectedBrokerNic,
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

  return (
    <div className="w-full min-h-screen p-4 sm:p-6 md:p-10 bg-white">
      <h1 className="text-center text-blue-800 text-2xl sm:text-3xl md:text-4xl font-extrabold mb-6">
        Broker Commission Payment
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

          {/* select mode */}
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

          {/* broker dropdown */}
          <div className="mb-4">
            <label className="block text-black font-semibold mb-1">
              Broker {brokerSelectMode === "nic" ? "NIC" : "Name"}
            </label>

            <select
              value={selectedBrokerNic || ""}
              onChange={(e) => handleBrokerChange(e.target.value)}
              className="w-full bg-white text-gray-800 px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

          {/* pending */}
          <div className="mb-4 rounded-xl border border-gray-200 bg-white p-3">
            <div className="text-xs text-gray-600">Total Pending Commission</div>
            <div className="text-2xl font-extrabold text-blue-700">
              {fetchingSummary ? "Loading..." : money(pending)}
            </div>
            <div className="text-[11px] text-gray-500">
              Rule: unlocked = (interestPaid × commission%) ; pending = unlocked − brokerPaid
            </div>
          </div>

          {/* pay form */}
          <form onSubmit={submitPayment} className="space-y-4">
            <div>
              <label className="block text-black font-semibold mb-1">Pay Amount</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="Enter pay amount"
                  className="w-full bg-white text-gray-800 px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  min="0"
                  step="0.01"
                  disabled={!selectedBrokerNic || pending <= 0}
                />
                <button
                  type="button"
                  className="px-3 rounded-xl bg-white border border-gray-300 text-sm hover:bg-gray-200"
                  onClick={() => setPayAmount(payMax > 0 ? String(payMax) : "")}
                  disabled={!selectedBrokerNic || pending <= 0}
                >
                  Max
                </button>
              </div>

              {pending > 0 && payAmount && Number(payAmount) > pending ? (
                <p className="mt-1 text-xs text-red-600 font-semibold">
                  Pay amount cannot be higher than pending commission
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
                paying ||
                pending <= 0 ||
                !payAmount ||
                Number(payAmount) <= 0 ||
                Number(payAmount) > pending
              }
            >
              {paying ? "Saving..." : "Pay Now"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
