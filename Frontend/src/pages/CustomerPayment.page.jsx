import React, { useEffect, useMemo, useState } from "react";
import {
  useLazyGetCustomerInvestmentsQuery,
  useCreateCustomerPaymentMutation,
} from "../api/customerpayApi";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const money = (n) => Number(n || 0).toLocaleString("en-LK");
const safe = (v) => (v === undefined || v === null || v === "" ? "-" : v);

export default function CustomerPaymantPage() {
  const [customers, setCustomers] = useState([]);
  const [brokers, setBrokers] = useState([]);

  const [customerId, setCustomerId] = useState("");
  const [brokerId, setBrokerId] = useState(""); // required
  const [selectedInvestmentId, setSelectedInvestmentId] = useState("");

  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [payFor, setPayFor] = useState("interest");
  const [payAmount, setPayAmount] = useState("");
  const [note, setNote] = useState("");

  const [loadInvs, { data: invRes, isFetching: loadingInv, error: invErr }] =
    useLazyGetCustomerInvestmentsQuery();

  const [createPay, { isLoading: paying }] = useCreateCustomerPaymentMutation();

  useEffect(() => {
    const load = async () => {
      try {
        const [cRes, bRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/customer`, { credentials: "include" }),
          fetch(`${BACKEND_URL}/api/broker`, { credentials: "include" }),
        ]);
        const cJson = await cRes.json();
        const bJson = await bRes.json();
        setCustomers(Array.isArray(cJson?.data) ? cJson.data : []);
        setBrokers(Array.isArray(bJson?.data) ? bJson.data : []);
      } catch {
        setCustomers([]);
        setBrokers([]);
      }
    };
    load();
  }, []);

  const selectedCustomer = useMemo(
    () => customers.find((c) => String(c._id) === String(customerId)) || null,
    [customers, customerId]
  );

  const selectedBroker = useMemo(
    () => brokers.find((b) => String(b._id) === String(brokerId)) || null,
    [brokers, brokerId]
  );

  useEffect(() => {
    setSelectedInvestmentId("");
    setPayAmount("");
    if (!selectedCustomer?.nic) return;
    if (!brokerId) return;

    loadInvs({
      nic: String(selectedCustomer.nic).trim(),
      brokerId,
    });
  }, [selectedCustomer?.nic, brokerId, loadInvs]);

  const investments = invRes?.data || [];

  const selectedInvestment = useMemo(() => {
    if (!selectedInvestmentId) return null;
    return investments.find((x) => String(x._id) === String(selectedInvestmentId)) || null;
  }, [investments, selectedInvestmentId]);

  const totals = useMemo(() => {
    if (!selectedInvestment) {
      return { investAmount: 0, thisMonthInterest: 0, arrearsInterest: 0, principalPending: 0 };
    }
    return {
      investAmount: Number(selectedInvestment.investmentAmount || 0),
      thisMonthInterest: Number(selectedInvestment.thisMonthInterest || 0),
      arrearsInterest: Number(selectedInvestment.arrearsInterest || 0),
      principalPending: Number(selectedInvestment.principalPending || 0),
    };
  }, [selectedInvestment]);

  // auto fill amount by pay type (user can edit)
  useEffect(() => {
    if (!selectedInvestment) {
      setPayAmount("");
      return;
    }
    const arrears = Number(selectedInvestment.arrearsInterest || 0);
    const principal = Number(selectedInvestment.principalPending || 0);

    let auto = 0;
    if (payFor === "interest") auto = arrears;
    if (payFor === "principal") auto = principal;
    if (payFor === "interest+principal") auto = arrears + principal;

    setPayAmount(auto > 0 ? String(auto) : "");
  }, [payFor, selectedInvestmentId]); // keep as you had

  const submitPayment = async (e) => {
    e.preventDefault();

    if (!selectedCustomer?.nic) return alert("Select customer");
    if (!brokerId) return alert("Select broker (required)");
    if (!selectedInvestment?._id) return alert("Select investment");

    const amount = Number(payAmount);
    if (!Number.isFinite(amount) || amount <= 0) return alert("Enter valid amount");

    try {
      const res = await createPay({
        customerNic: String(selectedCustomer.nic).trim(),
        brokerId, // ✅ send brokerId (required)
        investmentId: selectedInvestment._id,
        payAmount: amount,
        paymentType: paymentMethod,
        payFor,
        note,
      }).unwrap();

      if (!res?.success) return alert(res?.message || "Payment failed");

      const excess = Number(res?.data?.summary?.excessAmount || 0);
      alert(excess > 0 ? `Saved. Excess recorded: Rs. ${money(excess)}` : "Payment saved.");

      setNote("");

      await loadInvs({
        nic: String(selectedCustomer.nic).trim(),
        brokerId,
      }).unwrap();
    } catch (err) {
      alert(err?.data?.message || "Payment failed");
    }
  };

  return (
    <div className="w-full min-h-screen p-4 sm:p-6 md:p-10 bg-white">
      <h1 className="text-center text-blue-800 text-2xl sm:text-3xl font-extrabold mb-6">
        Customer Payment
      </h1>

      <div className="w-full flex justify-center">
        <div className="w-full max-w-3xl bg-gray-100 rounded-2xl shadow-sm p-5 sm:p-7 border border-gray-200">
          {/* CUSTOMER */}
          <div className="mb-4">
            <label className="block text-gray-700 mb-1 text-sm font-semibold">
              Customer (Name - NIC)
            </label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full bg-white text-gray-800 px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select customer</option>
              {customers.map((c) => (
                <option key={c._id} value={c._id}>
                  {safe(c.name)} - {safe(c.nic)}
                </option>
              ))}
            </select>
          </div>

          {/* BROKER */}
          <div className="mb-4">
            <label className="block text-gray-700 mb-1 text-sm font-semibold">Broker (required)</label>
            <select
              value={brokerId}
              onChange={(e) => setBrokerId(e.target.value)}
              className="w-full bg-white text-gray-800 px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!customerId}
              required
            >
              <option value="">Select broker</option>
              {brokers.map((b) => (
                <option key={b._id} value={b._id}>
                  {safe(b.name)} - {safe(b.nic)}
                </option>
              ))}
            </select>
            <div className="mt-2 text-xs text-gray-600">
              Selected: <b>{safe(selectedBroker?.name)}</b>
            </div>
          </div>

          {/* INVESTMENT */}
          <div className="mb-4">
            <label className="block text-gray-700 mb-1 text-sm font-semibold">Investment</label>
            <select
              value={selectedInvestmentId}
              onChange={(e) => setSelectedInvestmentId(e.target.value)}
              className="w-full bg-white text-gray-800 px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!selectedCustomer?.nic || !brokerId || loadingInv}
            >
              <option value="">{loadingInv ? "Loading..." : "Select investment"}</option>
              {investments.map((inv) => (
                <option key={inv._id} value={inv._id}>
                  {safe(inv.investmentName)} | Pending Principal: Rs.{money(inv.principalPending)} | Arrears Interest: Rs.{money(inv.arrearsInterest)}
                </option>
              ))}
            </select>

            {invErr && <div className="mt-2 text-xs text-red-600">Failed to load investments</div>}
            {!loadingInv && brokerId && selectedCustomer?.nic && investments.length === 0 && (
              <div className="mt-2 text-xs text-gray-600">No investments found.</div>
            )}
          </div>

          {/* SUMMARY */}
          <div className="mb-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl bg-white p-3">
              <div className="text-xs text-gray-500">Investment Amount</div>
              <div className="text-sm text-gray-900">Rs. {money(totals.investAmount)}</div>
            </div>
            <div className="rounded-xl bg-white p-3">
              <div className="text-xs text-gray-500">This Month Interest</div>
              <div className="text-sm text-gray-900">Rs. {money(totals.thisMonthInterest)}</div>
            </div>
            <div className="rounded-xl bg-white p-3">
              <div className="text-xs text-gray-500">Arrears Interest</div>
              <div className="text-sm text-gray-900">Rs. {money(totals.arrearsInterest)}</div>
            </div>
            <div className="rounded-xl bg-white p-3">
              <div className="text-xs text-gray-500">Pending Principal</div>
              <div className="text-sm text-gray-900">Rs. {money(totals.principalPending)}</div>
            </div>
          </div>

          {/* PAYMENT FORM */}
          <form onSubmit={submitPayment} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-700 mb-1 text-sm font-semibold">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-white text-gray-800 px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 mb-1 text-sm font-semibold">Payment Type</label>
                <select
                  value={payFor}
                  onChange={(e) => setPayFor(e.target.value)}
                  className="w-full bg-white text-gray-800 px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!selectedInvestmentId}
                >
                  <option value="interest">Interest only</option>
                  <option value="interest+principal">Investment amount + Interest</option>
                  <option value="principal">Investment amount only</option>
                </select>
              </div>
            </div>

            {/* amount auto-filled but editable */}
            <div>
              <label className="block text-gray-700 mb-1 text-sm font-semibold">Amount</label>
              <input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full bg-white text-gray-800 px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                step="0.01"
                required
              />
              <div className="text-[11px] text-gray-600 mt-1">
                Auto-filled based on payment type. You can edit the amount.
              </div>
            </div>

            <div>
              <label className="block text-gray-700 mb-1 text-sm font-semibold">Note</label>
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
              disabled={paying || !selectedInvestmentId || !brokerId}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white py-2.5 rounded-xl transition disabled:opacity-60 font-bold"
            >
              {paying ? "Saving..." : "Submit Payment"}
            </button>

            {!selectedInvestmentId && (
              <div className="text-xs text-gray-600">Select one investment to pay.</div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
