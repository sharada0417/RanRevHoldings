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
  return `${yyyy}-${mm}-${dd}`; // useful for search
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
const PersonSelect = ({ label, valueId, onChangeId, list, placeholder = "Select..." }) => {
  const selectedObj = useMemo(() => {
    if (!valueId) return null;
    return list.find((x) => x?._id === valueId) || null;
  }, [valueId, list]);

  return (
    <div className="rounded-xl border border-gray-200 p-3">
      <label className="text-sm text-gray-800">{label}</label>

      <select
        value={valueId || ""}
        onChange={(e) => onChangeId(e.target.value || "")}
        className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 bg-white"
      >
        <option value="">{placeholder}</option>
        {list.map((x) => (
          <option key={x._id} value={x._id}>
            {(x?.nic || "-")} - {(x?.name || "-")}
          </option>
        ))}
      </select>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="rounded-xl bg-gray-50 p-3">
          <div className="text-[11px] text-gray-500">Selected Name</div>
          <div className="text-sm text-gray-900 break-words">{selectedObj?.name || "-"}</div>
        </div>

        <div className="rounded-xl bg-gray-50 p-3">
          <div className="text-[11px] text-gray-500">Selected NIC</div>
          <div className="text-sm text-gray-900 break-words">{selectedObj?.nic || "-"}</div>
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
    const c = initial?.customerId;
    const b = initial?.brokerId;

    setCustomerId(c && typeof c === "object" ? c._id : c || "");
    setBrokerId(b && typeof b === "object" ? b._id : b || "");

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
    const amt = Number(estimateAmount);

    if (!assetName.trim()) return alert("Asset Name is required");
    if (!["vehicle", "land", "other"].includes(assetType))
      return alert("Asset Type must be vehicle / land / other");
    if (!Number.isFinite(amt) || amt < 0)
      return alert("Estimate Amount must be a valid number (>= 0)");

    if (assetType === "vehicle" && vehicleNumber.trim().length < 3)
      return alert("Vehicle Number is required for vehicle assets");

    if (assetType === "land" && landAddress.trim().length < 5)
      return alert("Land Address is required for land assets");

    onSubmit({
      customerId: customerId || null,
      brokerId: brokerId || null,
      assetName: assetName.trim(),
      assetType,
      vehicleNumber: assetType === "vehicle" ? vehicleNumber.trim().toUpperCase() : "",
      landAddress: assetType === "land" ? landAddress.trim() : "",
      estimateAmount: amt,
      assetDescription: assetDescription.trim(),
      // ✅ no assetDate anymore
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <PersonSelect
        label="Customer"
        valueId={customerId}
        onChangeId={setCustomerId}
        list={customers ?? []}
        placeholder="Select Customer (NIC - Name)"
      />

      <PersonSelect
        label="Broker"
        valueId={brokerId}
        onChangeId={setBrokerId}
        list={brokers ?? []}
        placeholder="Select Broker (NIC - Name)"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-sm text-gray-700">Asset Name</label>
          <input
            value={assetName}
            onChange={(e) => setAssetName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
            placeholder="Ex: Toyota Axio / Kandy Land"
            required
          />
        </div>

        <div>
          <label className="text-sm text-gray-700">Asset Type</label>
          <select
            value={assetType}
            onChange={(e) => setAssetType(e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none bg-white"
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
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
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
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
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
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
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
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
            placeholder="Notes..."
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-xl bg-blue-700 px-4 py-2 text-white text-sm hover:bg-blue-800 disabled:opacity-60"
      >
        {isLoading ? "Saving..." : "Save"}
      </button>
    </form>
  );
};

const AssetPage = () => {
  const dispatch = useDispatch();
  const { modal, selected } = useSelector((s) => s.asset || { modal: null, selected: null });

  const [searchText, setSearchText] = useState("");

  const [customers, setCustomers] = useState([]);
  const [brokers, setBrokers] = useState([]);

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

    loadCustomers();
    loadBrokers();
  }, []);

  const { data: listRes, isLoading: loadingList, error: listError } = useGetAssetsQuery();

  const [createAsset, { isLoading: creating }] = useCreateAssetMutation();
  const [updateAsset, { isLoading: updating }] = useUpdateAssetMutation();
  const [deleteAsset, { isLoading: deleting }] = useDeleteAssetMutation();

  const assetsRaw = listRes?.data || [];

  // ✅ search includes customer/broker nic+name + createdAt
  const assets = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return assetsRaw;

    return assetsRaw.filter((a) => {
      const c = a?.customerId && typeof a.customerId === "object" ? a.customerId : null;
      const b = a?.brokerId && typeof a.brokerId === "object" ? a.brokerId : null;

      const dateStr = toDateKey(a?.createdAt);

      const hay = [
        a?.assetName,
        a?.assetType,
        a?.estimateAmount,
        a?.assetDescription,
        a?._id,
        c?.nic,
        c?.name,
        b?.nic,
        b?.name,
        dateStr,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [assetsRaw, searchText]);

  const close = () => dispatch(closeAssetModal());

  const handleAdd = () => dispatch(openAssetModal({ modal: "add" }));
  const handleView = (asset) => dispatch(openAssetModal({ modal: "view", asset }));
  const handleEdit = (asset) => dispatch(openAssetModal({ modal: "edit", asset }));
  const handleDeleteAsk = (asset) => dispatch(openAssetModal({ modal: "delete", asset }));

  const onCreate = async (payload) => {
    try {
      const res = await createAsset(payload).unwrap();
      if (res?.success) close();
      else alert(res?.message || "Create failed");
    } catch (err) {
      alert(err?.data?.message || "Create failed");
    }
  };

  const onUpdate = async (payload) => {
    try {
      const res = await updateAsset({ id: selected?._id, payload }).unwrap();
      if (res?.success) close();
      else alert(res?.message || "Update failed");
    } catch (err) {
      alert(err?.data?.message || "Update failed");
    }
  };

  const onDelete = async () => {
    try {
      const res = await deleteAsset(selected?._id).unwrap();
      if (res?.success) close();
      else alert(res?.message || "Delete failed");
    } catch (err) {
      alert(err?.data?.message || "Delete failed");
    }
  };

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-6xl px-3 sm:px-6 py-4 sm:py-6 min-w-0">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-blue-800 text-center">Assets</h1>

        <div className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2">
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search (asset / customer / broker / date)"
            className="w-full sm:w-[560px] rounded-xl border border-gray-300 px-3 py-2 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            type="button"
            onClick={() => setSearchText("")}
            className="w-full sm:w-auto rounded-lg bg-gray-200 px-4 py-2 text-xs sm:text-sm text-gray-800 hover:bg-gray-300 transition"
          >
            Clear
          </button>
        </div>

        <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
            Total: <span className="font-bold">{assets.length}</span>
          </p>

          <div className="flex justify-center sm:justify-end">
            <button
              onClick={handleAdd}
              className="w-full sm:w-auto rounded-lg bg-green-600 px-4 py-2 text-xs sm:text-sm text-white font-bold hover:bg-green-700 transition"
            >
              + Add Asset
            </button>
          </div>
        </div>

        <div className="mt-4 w-full bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="w-full">
            <table className="w-full table-fixed">
              <thead className="hidden sm:table-header-group">
                <tr className="bg-gray-100 text-gray-800 text-sm">
                  <th className="p-3 text-center w-[110px]">Date</th>
                  <th className="p-3 text-center w-[180px]">Customer</th>
                  <th className="p-3 text-center w-[180px]">Broker</th>
                  <th className="p-3 text-center w-[160px]">Asset</th>
                  <th className="p-3 text-center w-[90px]">Type</th>
                  <th className="p-3 text-center w-[120px]">Amount</th>
                  <th className="p-3 text-center hidden md:table-cell">Description</th>
                  <th className="p-3 text-center w-[190px]">Operation</th>
                </tr>
              </thead>

              <tbody className="block sm:table-row-group">
                {loadingList ? (
                  <tr className="block sm:table-row">
                    <td className="block sm:table-cell p-6 text-center text-gray-500">Loading...</td>
                  </tr>
                ) : listError ? (
                  <tr className="block sm:table-row">
                    <td className="block sm:table-cell p-6 text-center text-red-500">
                      Failed to load assets
                    </td>
                  </tr>
                ) : assets.length === 0 ? (
                  <tr className="block sm:table-row">
                    <td className="block sm:table-cell p-6 text-center text-gray-500">
                      No assets found
                    </td>
                  </tr>
                ) : (
                  assets.map((a) => {
                    const c =
                      a?.customerId && typeof a.customerId === "object" ? a.customerId : null;
                    const b = a?.brokerId && typeof a.brokerId === "object" ? a.brokerId : null;

                    return (
                      <tr
                        key={a._id}
                        className="block sm:table-row mx-2 sm:mx-0 mb-3 sm:mb-0 bg-white rounded-xl sm:rounded-none sm:border-b border-gray-200"
                      >
                        <td className="block sm:table-cell p-3 text-left sm:text-center align-top break-words">
                          <span className="sm:hidden text-[11px] text-gray-500 mr-2">Date:</span>
                          {formatDateCell(a?.createdAt)}
                        </td>

                        <td className="block sm:table-cell p-3 text-left sm:text-center align-top break-words">
                          <span className="sm:hidden text-[11px] text-gray-500 mr-2">
                            Customer:
                          </span>
                          <div className="text-gray-900 break-words">{c?.name || "-"}</div>
                          <div className="text-[11px] text-gray-500 break-words">{c?.nic || "-"}</div>
                        </td>

                        <td className="block sm:table-cell p-3 text-left sm:text-center align-top break-words">
                          <span className="sm:hidden text-[11px] text-gray-500 mr-2">Broker:</span>
                          <div className="text-gray-900 break-words">{b?.name || "-"}</div>
                          <div className="text-[11px] text-gray-500 break-words">{b?.nic || "-"}</div>
                        </td>

                        <td className="block sm:table-cell p-3 text-left sm:text-center align-top break-words">
                          <span className="sm:hidden text-[11px] text-gray-500 mr-2">Asset:</span>
                          {a?.assetName || "-"}
                        </td>

                        <td className="block sm:table-cell p-3 text-left sm:text-center align-top break-words">
                          <span className="sm:hidden text-[11px] text-gray-500 mr-2">Type:</span>
                          {a?.assetType || "-"}
                        </td>

                        <td className="block sm:table-cell p-3 text-left sm:text-center align-top break-words">
                          <span className="sm:hidden text-[11px] text-gray-500 mr-2">Amount:</span>
                          {a?.estimateAmount ?? "-"}
                        </td>

                        <td className="hidden md:table-cell p-3 text-center align-top break-words">
                          {a?.assetDescription || "-"}
                        </td>

                        <td className="block sm:table-cell p-3 text-left sm:text-center align-top">
                          <span className="sm:hidden text-[11px] text-gray-500 mr-2">Action:</span>
                          <div className="flex flex-wrap justify-start sm:justify-center gap-2">
                            <button
                              onClick={() => handleView(a)}
                              className="rounded-md bg-blue-600 px-3 py-1 text-white text-[11px] sm:text-sm"
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleEdit(a)}
                              className="rounded-md bg-yellow-500 px-3 py-1 text-white text-[11px] sm:text-sm"
                            >
                              Update
                            </button>
                            <button
                              onClick={() => handleDeleteAsk(a)}
                              className="rounded-md bg-red-600 px-3 py-1 text-white text-[11px] sm:text-sm"
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
            const c =
              selected?.customerId && typeof selected.customerId === "object"
                ? selected.customerId
                : null;
            const b =
              selected?.brokerId && typeof selected.brokerId === "object"
                ? selected.brokerId
                : null;

            return (
              <div className="space-y-2 text-sm text-gray-800">
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Date</span>
                  <span className="text-right">{formatDateCell(selected?.createdAt)}</span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Customer</span>
                  <span className="text-right">
                    {c?.name || "-"} {c?.nic ? `(${c.nic})` : ""}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Broker</span>
                  <span className="text-right">
                    {b?.name || "-"} {b?.nic ? `(${b.nic})` : ""}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">Asset Name</span>
                  <span className="text-right break-words">{selected?.assetName || "-"}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">Type</span>
                  <span className="text-right">{selected?.assetType || "-"}</span>
                </div>

                {selected?.assetType === "vehicle" && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Vehicle Number</span>
                    <span className="text-right break-words">{selected?.vehicleNumber || "-"}</span>
                  </div>
                )}

                {selected?.assetType === "land" && (
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Land Address</span>
                    <span className="text-right break-words">{selected?.landAddress || "-"}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-gray-500">Amount</span>
                  <span className="text-right">{selected?.estimateAmount ?? "-"}</span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Description</span>
                  <span className="text-right break-words">{selected?.assetDescription || "-"}</span>
                </div>

                <button
                  onClick={() => dispatch(openAssetModal({ modal: "edit", asset: selected }))}
                  className="mt-3 w-full rounded-xl bg-yellow-500 px-4 py-2 text-white text-sm hover:bg-yellow-600"
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
            Are you sure you want to delete <b>{selected?.assetName || "this asset"}</b>?
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
