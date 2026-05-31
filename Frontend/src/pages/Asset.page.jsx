import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  useGetAssetsQuery,
  useCreateAssetMutation,
  useUpdateAssetMutation,
  useDeleteAssetMutation,
} from "../api/assetApi";
import { openAssetModal, closeAssetModal } from "../api/features/assetSlice";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

/* ---------- helpers ---------- */

const formatDateCell = (d) => {
  if (!d) return "-";

  const dt = new Date(d);

  if (Number.isNaN(dt.getTime())) return "-";

  return dt.toLocaleDateString();
};

const toDateKey = (d) => {
  if (!d) return "";

  const dt = new Date(d);

  if (Number.isNaN(dt.getTime())) return "";

  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
};

const cleanText = (value) => String(value || "").toLowerCase().trim();

const money = (value) => Number(value || 0).toLocaleString("en-LK");

const getPersonFromRef = (ref, list) => {
  if (!ref) return null;

  if (typeof ref === "object") {
    return ref;
  }

  return list.find((item) => String(item?._id) === String(ref)) || null;
};

/* ---------- Modal UI ---------- */

const ModalShell = ({ title, children, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
    <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl overflow-hidden">
      <div className="flex items-center justify-between border-b px-5 py-3">
        <h3 className="text-base font-extrabold text-blue-800">{title}</h3>

        <button
          onClick={onClose}
          className="rounded-lg px-3 py-1 text-sm text-gray-600 hover:bg-gray-100"
        >
          ✕
        </button>
      </div>

      <div className="p-4 max-h-[70vh] overflow-auto">{children}</div>
    </div>
  </div>
);

/* ---------- Dropdown Select ---------- */

const PersonSelect = ({
  label,
  valueId,
  onChangeId,
  list,
  placeholder = "Select...",
}) => {
  const selectedObj = useMemo(() => {
    if (!valueId) return null;

    return list.find((item) => item?._id === valueId) || null;
  }, [valueId, list]);

  return (
    <div className="rounded-xl border border-gray-200 p-3">
      <label className="text-sm text-gray-800">{label}</label>

      <select
        value={valueId || ""}
        onChange={(e) => onChangeId(e.target.value || "")}
        className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
      >
        <option value="">{placeholder}</option>

        {list.map((item) => (
          <option key={item._id} value={item._id}>
            {(item?.nic || "-")} - {(item?.name || "-")}
          </option>
        ))}
      </select>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="rounded-xl bg-gray-50 p-3">
          <div className="text-[11px] text-gray-500">Selected Name</div>
          <div className="break-words text-sm text-gray-900">
            {selectedObj?.name || "-"}
          </div>
        </div>

        <div className="rounded-xl bg-gray-50 p-3">
          <div className="text-[11px] text-gray-500">Selected NIC</div>
          <div className="break-words text-sm text-gray-900">
            {selectedObj?.nic || "-"}
          </div>
        </div>
      </div>

      {valueId && (
        <button
          type="button"
          onClick={() => onChangeId("")}
          className="mt-3 w-full rounded-xl bg-gray-200 px-4 py-2 text-sm text-gray-800 hover:bg-gray-300"
        >
          Clear
        </button>
      )}
    </div>
  );
};

/* ---------- Asset Form ---------- */

const AssetForm = ({ initial, customers, brokers, onSubmit, isLoading }) => {
  const [customerId, setCustomerId] = useState("");
  const [brokerId, setBrokerId] = useState("");

  const [assetName, setAssetName] = useState("");
  const [assetType, setAssetType] = useState("vehicle");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [landAddress, setLandAddress] = useState("");
  const [estimateAmount, setEstimateAmount] = useState("");
  const [assetDescription, setAssetDescription] = useState("");

  useEffect(() => {
    const customer = initial?.customerId;
    const broker = initial?.brokerId;

    setCustomerId(
      customer && typeof customer === "object" ? customer._id : customer || ""
    );

    setBrokerId(
      broker && typeof broker === "object" ? broker._id : broker || ""
    );

    setAssetName(initial?.assetName || "");
    setAssetType(initial?.assetType || "vehicle");
    setVehicleNumber(initial?.vehicleNumber || "");
    setLandAddress(initial?.landAddress || "");

    setEstimateAmount(
      initial?.estimateAmount !== undefined && initial?.estimateAmount !== null
        ? String(initial.estimateAmount)
        : ""
    );

    setAssetDescription(initial?.assetDescription || "");
  }, [initial]);

  useEffect(() => {
    if (assetType !== "vehicle") setVehicleNumber("");
    if (assetType !== "land") setLandAddress("");
  }, [assetType]);

  const submit = (e) => {
    e.preventDefault();

    const amount = Number(estimateAmount);

    if (!assetName.trim()) {
      alert("Asset Name is required");
      return;
    }

    if (!["vehicle", "land", "other"].includes(assetType)) {
      alert("Asset Type must be vehicle, land, or other");
      return;
    }

    if (!Number.isFinite(amount) || amount < 0) {
      alert("Estimate Amount must be a valid number");
      return;
    }

    if (assetType === "vehicle" && vehicleNumber.trim().length < 3) {
      alert("Vehicle Number is required for vehicle assets");
      return;
    }

    if (assetType === "land" && landAddress.trim().length < 5) {
      alert("Land Address is required for land assets");
      return;
    }

    onSubmit({
      customerId: customerId || null,
      brokerId: brokerId || null,
      assetName: assetName.trim(),
      assetType,
      vehicleNumber:
        assetType === "vehicle" ? vehicleNumber.trim().toUpperCase() : "",
      landAddress: assetType === "land" ? landAddress.trim() : "",
      estimateAmount: amount,
      assetDescription: assetDescription.trim(),
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <PersonSelect
        label="Customer"
        valueId={customerId}
        onChangeId={setCustomerId}
        list={customers ?? []}
        placeholder="Select Customer NIC - Name"
      />

      <PersonSelect
        label="Broker"
        valueId={brokerId}
        onChangeId={setBrokerId}
        list={brokers ?? []}
        placeholder="Select Broker NIC - Name"
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="text-sm text-gray-700">Asset Name</label>
          <input
            value={assetName}
            onChange={(e) => setAssetName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Ex: Toyota Axio / Kandy Land"
            required
          />
        </div>

        <div>
          <label className="text-sm text-gray-700">Asset Type</label>
          <select
            value={assetType}
            onChange={(e) => setAssetType(e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
            required
          >
            <option value="vehicle">vehicle</option>
            <option value="land">land</option>
            <option value="other">other</option>
          </select>
        </div>

        {assetType === "vehicle" && (
          <div className="sm:col-span-2">
            <label className="text-sm text-gray-700">Vehicle Number</label>
            <input
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Ex: WP CAB-1234"
              required
            />
          </div>
        )}

        {assetType === "land" && (
          <div className="sm:col-span-2">
            <label className="text-sm text-gray-700">Land Address</label>
            <input
              value={landAddress}
              onChange={(e) => setLandAddress(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Ex: No 12, Main Road, Kandy"
              required
            />
          </div>
        )}

        <div className="sm:col-span-2">
          <label className="text-sm text-gray-700">Estimate Amount</label>
          <input
            value={estimateAmount}
            onChange={(e) => setEstimateAmount(e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="1500000"
            required
          />
        </div>

        <div className="sm:col-span-2">
          <label className="text-sm text-gray-700">Description</label>
          <textarea
            value={assetDescription}
            onChange={(e) => setAssetDescription(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Notes..."
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-xl bg-blue-700 px-4 py-2 text-sm text-white hover:bg-blue-800 disabled:opacity-60"
      >
        {isLoading ? "Saving..." : "Save"}
      </button>
    </form>
  );
};

/* ---------- Page ---------- */

const AssetPage = () => {
  const dispatch = useDispatch();

  const { modal, selected } = useSelector(
    (state) => state.asset || { modal: null, selected: null }
  );

  const [fromDateInput, setFromDateInput] = useState("");
  const [toDateInput, setToDateInput] = useState("");
  const [assetNameInput, setAssetNameInput] = useState("");
  const [assetTypeInput, setAssetTypeInput] = useState("all");
  const [customerInput, setCustomerInput] = useState("");
  const [brokerInput, setBrokerInput] = useState("");

  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",
    assetName: "",
    assetType: "all",
    customer: "",
    broker: "",
  });

  const [customers, setCustomers] = useState([]);
  const [brokers, setBrokers] = useState([]);

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

    loadCustomers();
    loadBrokers();
  }, []);

  const {
    data: listRes,
    isLoading: loadingList,
    error: listError,
  } = useGetAssetsQuery();

  const [createAsset, { isLoading: creating }] = useCreateAssetMutation();
  const [updateAsset, { isLoading: updating }] = useUpdateAssetMutation();
  const [deleteAsset, { isLoading: deleting }] = useDeleteAssetMutation();

  const assetsRaw = listRes?.data || [];

  const assets = useMemo(() => {
    const fromDate = filters.fromDate;
    const toDate = filters.toDate;
    const assetNameSearch = cleanText(filters.assetName);
    const assetTypeSearch = filters.assetType;
    const customerSearch = cleanText(filters.customer);
    const brokerSearch = cleanText(filters.broker);

    return assetsRaw.filter((asset) => {
      const customer = getPersonFromRef(asset?.customerId, customers);
      const broker = getPersonFromRef(asset?.brokerId, brokers);

      const assetDate = toDateKey(asset?.createdAt);
      const assetName = cleanText(asset?.assetName);
      const assetType = cleanText(asset?.assetType);

      const customerName = cleanText(customer?.name);
      const customerNic = cleanText(customer?.nic);

      const brokerName = cleanText(broker?.name);
      const brokerNic = cleanText(broker?.nic);

      const matchFromDate = !fromDate || assetDate >= fromDate;
      const matchToDate = !toDate || assetDate <= toDate;

      const matchAssetName =
        !assetNameSearch || assetName.includes(assetNameSearch);

      const matchAssetType =
        assetTypeSearch === "all" || assetType === assetTypeSearch;

      const matchCustomer =
        !customerSearch ||
        customerName.includes(customerSearch) ||
        customerNic.includes(customerSearch);

      const matchBroker =
        !brokerSearch ||
        brokerName.includes(brokerSearch) ||
        brokerNic.includes(brokerSearch);

      return (
        matchFromDate &&
        matchToDate &&
        matchAssetName &&
        matchAssetType &&
        matchCustomer &&
        matchBroker
      );
    });
  }, [assetsRaw, customers, brokers, filters]);

  const close = () => dispatch(closeAssetModal());

  const handleSearch = (e) => {
    e.preventDefault();

    if (fromDateInput && toDateInput && fromDateInput > toDateInput) {
      alert("From Date cannot be after To Date");
      return;
    }

    setFilters({
      fromDate: fromDateInput,
      toDate: toDateInput,
      assetName: assetNameInput,
      assetType: assetTypeInput,
      customer: customerInput,
      broker: brokerInput,
    });
  };

  const handleClearFilters = () => {
    setFromDateInput("");
    setToDateInput("");
    setAssetNameInput("");
    setAssetTypeInput("all");
    setCustomerInput("");
    setBrokerInput("");

    setFilters({
      fromDate: "",
      toDate: "",
      assetName: "",
      assetType: "all",
      customer: "",
      broker: "",
    });
  };

  const handleAdd = () => dispatch(openAssetModal({ modal: "add" }));

  const handleView = (asset) =>
    dispatch(openAssetModal({ modal: "view", asset }));

  const handleEdit = (asset) =>
    dispatch(openAssetModal({ modal: "edit", asset }));

  const handleDeleteAsk = (asset) =>
    dispatch(openAssetModal({ modal: "delete", asset }));

  const onCreate = async (payload) => {
    try {
      const res = await createAsset(payload).unwrap();

      if (res?.success) {
        close();
      } else {
        alert(res?.message || "Create failed");
      }
    } catch (err) {
      alert(err?.data?.message || "Create failed");
    }
  };

  const onUpdate = async (payload) => {
    try {
      const res = await updateAsset({
        id: selected?._id,
        payload,
      }).unwrap();

      if (res?.success) {
        close();
      } else {
        alert(res?.message || "Update failed");
      }
    } catch (err) {
      alert(err?.data?.message || "Update failed");
    }
  };

  const onDelete = async () => {
    try {
      const res = await deleteAsset(selected?._id).unwrap();

      if (res?.success) {
        close();
      } else {
        alert(res?.message || "Delete failed");
      }
    } catch (err) {
      alert(err?.data?.message || "Delete failed");
    }
  };

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-7xl min-w-0 px-3 py-4 sm:px-6 sm:py-6">
        <h1 className="text-center text-2xl font-extrabold text-blue-800 sm:text-3xl">
          Assets
        </h1>

        {/* FILTER BOXES */}
        <form
          onSubmit={handleSearch}
          className="mt-5 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-7"
        >
          <div>
            <label className="mb-1 block text-[11px] font-bold text-gray-500">
              From Date
            </label>
            <input
              type="date"
              value={fromDateInput}
              onChange={(e) => setFromDateInput(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-400 sm:text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold text-gray-500">
              To Date
            </label>
            <input
              type="date"
              value={toDateInput}
              onChange={(e) => setToDateInput(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-400 sm:text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold text-gray-500">
              Asset Name
            </label>
            <input
              type="text"
              value={assetNameInput}
              onChange={(e) => setAssetNameInput(e.target.value)}
              placeholder="Asset Name"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-400 sm:text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold text-gray-500">
              Asset Type
            </label>
            <select
              value={assetTypeInput}
              onChange={(e) => setAssetTypeInput(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-400 sm:text-sm"
            >
              <option value="all">All Types</option>
              <option value="vehicle">vehicle</option>
              <option value="land">land</option>
              <option value="other">other</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold text-gray-500">
              Customer
            </label>
            <input
              type="text"
              value={customerInput}
              onChange={(e) => setCustomerInput(e.target.value)}
              placeholder="NIC or Name"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-400 sm:text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold text-gray-500">
              Broker
            </label>
            <input
              type="text"
              value={brokerInput}
              onChange={(e) => setBrokerInput(e.target.value)}
              placeholder="NIC or Name"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-400 sm:text-sm"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="w-full rounded-lg bg-blue-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-800 sm:text-sm"
            >
              Search
            </button>

            <button
              type="button"
              onClick={handleClearFilters}
              className="w-full rounded-lg bg-gray-200 px-4 py-2 text-xs font-bold text-gray-800 transition hover:bg-gray-300 sm:text-sm"
            >
              Clear
            </button>
          </div>
        </form>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-center text-xs text-gray-600 sm:text-left sm:text-sm">
            Total: <span className="font-bold">{assets.length}</span>
          </p>

          <div className="flex justify-center sm:justify-end">
            <button
              onClick={handleAdd}
              className="w-full rounded-lg bg-green-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-green-700 sm:w-auto sm:text-sm"
            >
              + Add Asset
            </button>
          </div>
        </div>

        <div className="mt-4 w-full overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
          <table className="w-full min-w-[1100px]">
            <thead className="hidden sm:table-header-group">
              <tr className="bg-gray-100 text-sm text-gray-800">
                <th className="w-[110px] p-3 text-center">Date</th>
                <th className="w-[180px] p-3 text-center">Customer</th>
                <th className="w-[180px] p-3 text-center">Broker</th>
                <th className="w-[160px] p-3 text-center">Asset</th>
                <th className="w-[90px] p-3 text-center">Type</th>
                <th className="w-[120px] p-3 text-center">Amount</th>
                <th className="p-3 text-center">Description</th>
                <th className="w-[190px] p-3 text-center">Operation</th>
              </tr>
            </thead>

            <tbody className="block sm:table-row-group">
              {loadingList ? (
                <tr className="block sm:table-row">
                  <td
                    colSpan={8}
                    className="block p-6 text-center text-gray-500 sm:table-cell"
                  >
                    Loading...
                  </td>
                </tr>
              ) : listError ? (
                <tr className="block sm:table-row">
                  <td
                    colSpan={8}
                    className="block p-6 text-center text-red-500 sm:table-cell"
                  >
                    Failed to load assets
                  </td>
                </tr>
              ) : assets.length === 0 ? (
                <tr className="block sm:table-row">
                  <td
                    colSpan={8}
                    className="block p-6 text-center text-gray-500 sm:table-cell"
                  >
                    No assets found
                  </td>
                </tr>
              ) : (
                assets.map((asset) => {
                  const customer = getPersonFromRef(asset?.customerId, customers);
                  const broker = getPersonFromRef(asset?.brokerId, brokers);

                  return (
                    <tr
                      key={asset._id}
                      className="mx-2 mb-3 block rounded-xl border-gray-200 bg-white sm:mx-0 sm:mb-0 sm:table-row sm:rounded-none sm:border-b"
                    >
                      <td className="block p-3 text-left align-top sm:table-cell sm:text-center">
                        <span className="mr-2 text-[11px] text-gray-500 sm:hidden">
                          Date:
                        </span>
                        {formatDateCell(asset?.createdAt)}
                      </td>

                      <td className="block p-3 text-left align-top sm:table-cell sm:text-center">
                        <span className="mr-2 text-[11px] text-gray-500 sm:hidden">
                          Customer:
                        </span>
                        <div className="break-words text-gray-900">
                          {customer?.name || "-"}
                        </div>
                        <div className="break-words text-[11px] text-gray-500">
                          {customer?.nic || "-"}
                        </div>
                      </td>

                      <td className="block p-3 text-left align-top sm:table-cell sm:text-center">
                        <span className="mr-2 text-[11px] text-gray-500 sm:hidden">
                          Broker:
                        </span>
                        <div className="break-words text-gray-900">
                          {broker?.name || "-"}
                        </div>
                        <div className="break-words text-[11px] text-gray-500">
                          {broker?.nic || "-"}
                        </div>
                      </td>

                      <td className="block p-3 text-left align-top sm:table-cell sm:text-center">
                        <span className="mr-2 text-[11px] text-gray-500 sm:hidden">
                          Asset:
                        </span>
                        {asset?.assetName || "-"}
                      </td>

                      <td className="block p-3 text-left align-top sm:table-cell sm:text-center">
                        <span className="mr-2 text-[11px] text-gray-500 sm:hidden">
                          Type:
                        </span>
                        {asset?.assetType || "-"}
                      </td>

                      <td className="block p-3 text-left align-top sm:table-cell sm:text-center">
                        <span className="mr-2 text-[11px] text-gray-500 sm:hidden">
                          Amount:
                        </span>
                        Rs. {money(asset?.estimateAmount)}
                      </td>

                      <td className="block p-3 text-left align-top sm:table-cell sm:text-center">
                        <span className="mr-2 text-[11px] text-gray-500 sm:hidden">
                          Description:
                        </span>
                        {asset?.assetDescription || "-"}
                      </td>

                      <td className="block p-3 text-left align-top sm:table-cell sm:text-center">
                        <span className="mr-2 text-[11px] text-gray-500 sm:hidden">
                          Action:
                        </span>

                        <div className="flex flex-wrap justify-start gap-2 sm:justify-center">
                          <button
                            onClick={() => handleView(asset)}
                            className="rounded-md bg-blue-600 px-3 py-1 text-[11px] text-white sm:text-sm"
                          >
                            View
                          </button>

                          <button
                            onClick={() => handleEdit(asset)}
                            className="rounded-md bg-yellow-500 px-3 py-1 text-[11px] text-white sm:text-sm"
                          >
                            Update
                          </button>

                          <button
                            onClick={() => handleDeleteAsk(asset)}
                            className="rounded-md bg-red-600 px-3 py-1 text-[11px] text-white sm:text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD */}
      {modal === "add" && (
        <ModalShell title="Add Asset" onClose={close}>
          <AssetForm
            initial={null}
            customers={customers}
            brokers={brokers}
            onSubmit={onCreate}
            isLoading={creating}
          />
        </ModalShell>
      )}

      {/* VIEW */}
      {modal === "view" && selected && (
        <ModalShell title="Asset Details" onClose={close}>
          {(() => {
            const customer = getPersonFromRef(selected?.customerId, customers);
            const broker = getPersonFromRef(selected?.brokerId, brokers);

            return (
              <div className="space-y-2 text-sm text-gray-800">
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Date</span>
                  <span className="text-right">
                    {formatDateCell(selected?.createdAt)}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Customer</span>
                  <span className="text-right">
                    {customer?.name || "-"}{" "}
                    {customer?.nic ? `(${customer.nic})` : ""}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Broker</span>
                  <span className="text-right">
                    {broker?.name || "-"}{" "}
                    {broker?.nic ? `(${broker.nic})` : ""}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Asset Name</span>
                  <span className="break-words text-right">
                    {selected?.assetName || "-"}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Type</span>
                  <span className="text-right">
                    {selected?.assetType || "-"}
                  </span>
                </div>

                {selected?.assetType === "vehicle" && (
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Vehicle Number</span>
                    <span className="break-words text-right">
                      {selected?.vehicleNumber || "-"}
                    </span>
                  </div>
                )}

                {selected?.assetType === "land" && (
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Land Address</span>
                    <span className="break-words text-right">
                      {selected?.landAddress || "-"}
                    </span>
                  </div>
                )}

                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Amount</span>
                  <span className="text-right">
                    Rs. {money(selected?.estimateAmount)}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Description</span>
                  <span className="break-words text-right">
                    {selected?.assetDescription || "-"}
                  </span>
                </div>

                <button
                  onClick={() =>
                    dispatch(
                      openAssetModal({
                        modal: "edit",
                        asset: selected,
                      })
                    )
                  }
                  className="mt-3 w-full rounded-xl bg-yellow-500 px-4 py-2 text-sm text-white hover:bg-yellow-600"
                >
                  Update
                </button>
              </div>
            );
          })()}
        </ModalShell>
      )}

      {/* EDIT */}
      {modal === "edit" && selected && (
        <ModalShell title="Update Asset" onClose={close}>
          <AssetForm
            initial={selected}
            customers={customers}
            brokers={brokers}
            onSubmit={onUpdate}
            isLoading={updating}
          />
        </ModalShell>
      )}

      {/* DELETE */}
      {modal === "delete" && selected && (
        <ModalShell title="Delete Asset" onClose={close}>
          <p className="text-sm text-gray-700">
            Are you sure you want to delete{" "}
            <b>{selected?.assetName || "this asset"}</b>?
          </p>

          <div className="mt-4 flex gap-2">
            <button
              onClick={close}
              className="w-full rounded-xl bg-gray-200 px-4 py-2 text-sm text-gray-800 hover:bg-gray-300"
            >
              Cancel
            </button>

            <button
              onClick={onDelete}
              disabled={deleting}
              className="w-full rounded-xl bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-60"
            >
              {deleting ? "Deleting..." : "Yes, Delete"}
            </button>
          </div>
        </ModalShell>
      )}
    </div>
  );
};

export default AssetPage;