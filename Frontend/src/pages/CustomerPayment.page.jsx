import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  setCustomerSelectMode,
  setSelectedCustomer,
  setAssetSelectMode,
  setSelectedAssetId,
  setSelectedInvestmentId,
  resetCustomerPay,
} from "../api/features/customerpaySlice";
import {
  useLazyGetCustomerAssetFullReportQuery,
  useCreateCustomerPaymentMutation,
} from "../api/customerpayApi";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const money = (n) => Number(n || 0).toLocaleString("en-LK");
const safe = (v) => (v === undefined || v === null || v === "" ? "-" : v);

export default function CustomerPaymantPage() {
  const dispatch = useDispatch();
  const {
    customerSelectMode,
    selectedCustomerId,
    selectedCustomerNic,
    assetSelectMode,
    selectedAssetId,
    selectedInvestmentId,
  } = useSelector((s) => s.customerPay);

  const [customers, setCustomers] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loadingLists, setLoadingLists] = useState(false);

  const [paymentType, setPaymentType] = useState("cash"); // cash | check
  const [payAmount, setPayAmount] = useState("");
  const [note, setNote] = useState("");

  const [loadReport, { data: reportRes, isFetching: fetchingReport, error: reportErr }] =
    useLazyGetCustomerAssetFullReportQuery();

  const [createPay, { isLoading: paying }] = useCreateCustomerPaymentMutation();

  // load customers + assets
  useEffect(() => {
    const load = async () => {
      try {
        setLoadingLists(true);

        const [cRes, aRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/customer`, {
            method: "GET",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          }),
          fetch(`${BACKEND_URL}/api/assets`, {
            method: "GET",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          }),
        ]);

        const cJson = await cRes.json();
        const aJson = await aRes.json();

        setCustomers(Array.isArray(cJson?.data) ? cJson.data : []);
        setAssets(Array.isArray(aJson?.data) ? aJson.data : []);
      } catch {
        setCustomers([]);
        setAssets([]);
      } finally {
        setLoadingLists(false);
      }
    };
    load();
  }, []);

  const selectedCustomerObj = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customers.find((c) => c._id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  // assets only for selected customer
  const customerAssets = useMemo(() => {
    if (!selectedCustomerId) return [];
    return assets.filter((a) => {
      const cid =
        a?.customerId && typeof a.customerId === "object"
          ? a.customerId?._id
          : a?.customerId;
      return String(cid || "") === String(selectedCustomerId);
    });
  }, [assets, selectedCustomerId]);

  const selectedAssetObj = useMemo(() => {
    if (!selectedAssetId) return null;
    return customerAssets.find((a) => a._id === selectedAssetId) || null;
  }, [customerAssets, selectedAssetId]);

  // report data from backend
  const reportData = reportRes?.data || [];
  const latestInvestment = reportData?.[0] || null;

  const activeInvestment = useMemo(() => {
    if (!reportData.length) return null;
    if (!selectedInvestmentId) return latestInvestment;
    return (
      reportData.find((x) => String(x.investmentId) === String(selectedInvestmentId)) ||
      latestInvestment
    );
  }, [reportData, selectedInvestmentId, latestInvestment]);

  // when customer+asset selected -> load report
  useEffect(() => {
    if (!selectedCustomerNic || !selectedAssetId) return;
    loadReport({ nic: selectedCustomerNic, assetId: selectedAssetId });
  }, [selectedCustomerNic, selectedAssetId, loadReport]);

  const handleCustomerChange = (customerId) => {
    const c = customers.find((x) => x._id === customerId);
    dispatch(
      setSelectedCustomer({
        customerId: c?._id || null,
        customerNic: c?.nic || "",
      })
    );
  };

  const submitPayment = async (e) => {
    e.preventDefault();

    if (!selectedCustomerNic) return alert("Select customer");
    if (!selectedAssetId) return alert("Select asset");
    if (!activeInvestment?.investmentId)
      return alert("No investment found for this customer + asset");

    const amount = Number(payAmount);
    if (!Number.isFinite(amount) || amount <= 0) return alert("Enter valid payment amount");

    const pending = Number(activeInvestment?.totalpendingpayment ?? 0);
    if (pending > 0 && amount > pending) return alert(`Amount cannot be greater than pending (${pending})`);

    try {
      const res = await createPay({
        customerNic: selectedCustomerNic,
        investmentId: activeInvestment.investmentId,
        payAmount: amount,
        paymentType,
        note,
      }).unwrap();

      if (res?.success) {
        alert("Payment recorded");
        setPayAmount("");
        setNote("");
        await loadReport({ nic: selectedCustomerNic, assetId: selectedAssetId }).unwrap();
      } else {
        alert(res?.message || "Payment failed");
      }
    } catch (err) {
      alert(err?.data?.message || "Payment failed");
    }
  };

  return (
    <div className="w-full min-h-screen p-4 sm:p-6 md:p-10">
      <h1 className="text-center text-blue-800 text-2xl sm:text-3xl font-extrabold mb-6">
        Customer Payment
      </h1>

      <div className="w-full flex justify-center">
        {/* ✅ Card background gray + ✅ border removed */}
        <div className="w-full max-w-2xl bg-gray-100 rounded-2xl shadow-sm p-5 sm:p-7">
          {/* Top actions */}
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => dispatch(resetCustomerPay())}
              className="rounded-xl bg-white px-4 py-2 text-sm text-gray-800 hover:bg-gray-200"
            >
              Reset
            </button>
          </div>

          {/* CUSTOMER SELECT MODE */}
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => dispatch(setCustomerSelectMode("nic"))}
              className={`rounded-xl px-4 py-2 text-sm border ${
                customerSelectMode === "nic" ? "bg-blue-50 border-blue-300" : "bg-white"
              }`}
            >
              Select by NIC
            </button>
            <button
              type="button"
              onClick={() => dispatch(setCustomerSelectMode("name"))}
              className={`rounded-xl px-4 py-2 text-sm border ${
                customerSelectMode === "name" ? "bg-blue-50 border-blue-300" : "bg-white"
              }`}
            >
              Select by Name
            </button>
          </div>

          {/* CUSTOMER DROPDOWN */}
          <div className="mb-4">
            <label className="block text-gray-700 mb-1 text-sm">Customer</label>
            <select
              value={selectedCustomerId || ""}
              onChange={(e) => handleCustomerChange(e.target.value)}
              className="w-full bg-white text-gray-800 px-4 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loadingLists}
            >
              <option value="">Select customer</option>
              {customers.map((c) => (
                <option key={c._id} value={c._id}>
                  {customerSelectMode === "nic"
                    ? `${safe(c.nic)} - ${safe(c.name)}`
                    : `${safe(c.name)} - ${safe(c.nic)}`}
                </option>
              ))}
            </select>
            <div className="mt-2 text-xs text-gray-500">
              Selected: {safe(selectedCustomerObj?.name)} <br />
              NIC: {safe(selectedCustomerObj?.nic)}
            </div>
          </div>

          {/* ASSET SELECT MODE */}
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => dispatch(setAssetSelectMode("name"))}
              className={`rounded-xl px-4 py-2 text-sm border ${
                assetSelectMode === "name" ? "bg-blue-50 border-blue-300" : "bg-white"
              }`}
              disabled={!selectedCustomerId}
            >
              Asset by Name
            </button>
            <button
              type="button"
              onClick={() => dispatch(setAssetSelectMode("type"))}
              className={`rounded-xl px-4 py-2 text-sm border ${
                assetSelectMode === "type" ? "bg-blue-50 border-blue-300" : "bg-white"
              }`}
              disabled={!selectedCustomerId}
            >
              Asset by Type
            </button>
          </div>

          {/* ASSET DROPDOWN */}
          <div className="mb-4">
            <label className="block text-gray-700 mb-1 text-sm">Asset</label>
            <select
              value={selectedAssetId || ""}
              onChange={(e) => dispatch(setSelectedAssetId(e.target.value))}
              className="w-full bg-white text-gray-800 px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!selectedCustomerId}
            >
              <option value="">Select asset</option>
              {customerAssets.map((a) => (
                <option key={a._id} value={a._id}>
                  {assetSelectMode === "name"
                    ? `${safe(a.assetName)} - ${safe(a.assetType)}`
                    : `${safe(a.assetType)} - ${safe(a.assetName)}`}
                </option>
              ))}
            </select>

            <div className="mt-2 text-xs text-gray-500">
              Asset Type: {safe(selectedAssetObj?.assetType)} <br />
              Asset Name: {safe(selectedAssetObj?.assetName)} <br />
              Estimate: Rs. {money(selectedAssetObj?.estimateAmount)}
            </div>
          </div>

          {/* INVESTMENT PICK */}
          <div className="mb-4">
            <label className="block text-gray-700 mb-1 text-sm">Investment</label>
            <select
              value={selectedInvestmentId || ""}
              onChange={(e) => dispatch(setSelectedInvestmentId(e.target.value))}
              className="w-full bg-white text-gray-800 px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!selectedAssetId || fetchingReport}
            >
              <option value="">
                {fetchingReport ? "Loading investments..." : "Latest investment (default)"}
              </option>
              {reportData.map((inv) => (
                <option key={inv.investmentId} value={inv.investmentId}>
                  {`ID: ${String(inv.investmentId).slice(-6)} | Amount: Rs.${money(
                    inv.investamount
                  )} | Pending: Rs.${money(inv.totalpendingpayment)}`}
                </option>
              ))}
            </select>

            {reportErr && <div className="mt-2 text-xs text-red-600">Failed to load report</div>}
          </div>

          {/* AUTO SUMMARY */}
          <div className="mb-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl bg-white p-3">
              <div className="text-xs text-gray-500">Investment Amount</div>
              <div className="text-sm text-gray-900">Rs. {money(activeInvestment?.investamount)}</div>
            </div>

            <div className="rounded-xl bg-white p-3">
              <div className="text-xs text-gray-500">Total Payable (with interest)</div>
              <div className="text-sm text-gray-900">
                Rs. {money(activeInvestment?.totalinvestmentwithintrestamount)}
              </div>
            </div>

            <div className="rounded-xl bg-white p-3">
              <div className="text-xs text-gray-500">Remaining Pending</div>
              <div className="text-sm text-gray-900">
                Rs. {money(activeInvestment?.totalpendingpayment)}
              </div>
            </div>

            <div className="rounded-xl bg-white p-3">
              <div className="text-xs text-gray-500">This Month Due</div>
              <div className="text-sm text-gray-900">
                Rs. {money(activeInvestment?.monthlyintesetwithinvset)}
              </div>
              <div className="text-[11px] text-gray-500">(monthly total = investment + interest)</div>
            </div>
          </div>

          {/* PAYMENT FORM */}
          <form onSubmit={submitPayment} className="space-y-4">
            <div>
              <label className="block text-gray-700 mb-1 text-sm">Payment Type</label>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value)}
                className="w-full bg-white text-gray-800 px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="cash">Cash</option>
                <option value="check">Check</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-700 mb-1 text-sm">Amount</label>
              <input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="Enter payment amount"
                className="w-full bg-white text-gray-800 px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                step="0.01"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-1 text-sm">Note</label>
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
              disabled={paying || !activeInvestment?.investmentId}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white py-2.5 rounded-xl transition disabled:opacity-60"
            >
              {paying ? "Saving..." : "Submit Payment"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
