import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  useGetBrokersQuery,
  useLazySearchBrokersQuery,
  useCreateBrokerMutation,
  useUpdateBrokerMutation,
  useDeleteBrokerMutation,
} from "../api/brokerApi";
import { openBrokerModal, closeBrokerModal } from "../api/features/brokerSlice";

/* ----------------------------- Small Toast ----------------------------- */
const Toast = ({ toast, onClose }) => {
  if (!toast?.open) return null;

  const bg =
    toast.type === "success"
      ? "bg-green-600"
      : toast.type === "error"
      ? "bg-red-600"
      : "bg-blue-600";

  return (
    <div className="fixed top-4 right-4 z-[9999]">
      <div className={`${bg} text-white px-4 py-3 rounded-xl shadow-lg w-[320px]`}>
        <div className="flex items-start justify-between gap-3">
          <div className="text-sm font-semibold">{toast.title || "Notice"}</div>
          <button
            onClick={onClose}
            className="text-white/90 hover:text-white text-sm font-bold"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {toast.message ? (
          <div className="text-xs mt-1 text-white/90">{toast.message}</div>
        ) : null}
      </div>
    </div>
  );
};

/* --------------------------- Reusable Modal UI -------------------------- */
const ModalShell = ({ title, children, onClose }) => {
  return (
    <div className="fixed inset-0 z-[9998] bg-black/40 flex items-center justify-center p-3">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-blue-800">{title}</h3>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

/* ------------------------------ Validators ------------------------------ */
const isValidNIC = (nic) => {
  const v = String(nic || "").trim();
  return (
    /^\d{12}$/.test(v) ||
    /^\d{11}[VvXx]$/.test(v) ||
    /^\d{9}[VvXx]$/.test(v)
  );
};

const normalizePhone = (tpRaw) => {
  let tp = String(tpRaw || "").trim().replace(/[\s\-+]/g, "");
  if (/^0\d{9}$/.test(tp)) tp = "94" + tp.slice(1);
  if (!/^94\d{9}$/.test(tp)) return null;
  return tp;
};

const isNonEmpty = (v) => String(v || "").trim().length > 0;

const BrokerPage = () => {
  const dispatch = useDispatch();
  const { modal, selected } = useSelector((s) => s.broker || { modal: null, selected: null });

  const [searchText, setSearchText] = useState("");

  // Toast
  const [toast, setToast] = useState({ open: false, type: "success", title: "", message: "" });
  const showToast = (type, title, message) => {
    setToast({ open: true, type, title, message });
    window.clearTimeout(window.__toastTimer);
    window.__toastTimer = window.setTimeout(() => setToast((t) => ({ ...t, open: false })), 2600);
  };

  // List + Search
  const { data: listData, isLoading: listLoading, isError: listError } = useGetBrokersQuery();
  const [triggerSearch, searchResult] = useLazySearchBrokersQuery();
  const { data: searchData, isFetching: searchLoading } = searchResult;

  // Mutations
  const [createBroker, { isLoading: creating }] = useCreateBrokerMutation();
  const [updateBroker, { isLoading: updating }] = useUpdateBrokerMutation();
  const [deleteBroker, { isLoading: deleting }] = useDeleteBrokerMutation();

  const brokers = useMemo(() => {
    const hasSearch = String(searchText || "").trim().length > 0 && searchData?.data;
    if (hasSearch) return searchData.data;
    return listData?.data || [];
  }, [listData, searchData, searchText]);

  const total = brokers.length;
  const loading = listLoading || searchLoading;

  const handleSearch = async (e) => {
    e.preventDefault();
    const q = String(searchText || "").trim();
    if (!q) {
      showToast("info", "Search", "Type NIC or Name to search.");
      return;
    }

    const isNicLike = /[0-9]/.test(q);
    try {
      await triggerSearch({ nic: isNicLike ? q : "", name: !isNicLike ? q : "" }).unwrap();
    } catch (err) {
      showToast("error", "Search Failed", err?.data?.message || "Unable to search brokers.");
    }
  };

  const clearSearch = () => setSearchText("");

  // Modals
  const openAdd = () => dispatch(openBrokerModal({ modal: "add" }));
  const openView = (broker) => dispatch(openBrokerModal({ modal: "view", broker }));
  const openEdit = (broker) => dispatch(openBrokerModal({ modal: "edit", broker }));
  const openDelete = (broker) => dispatch(openBrokerModal({ modal: "delete", broker }));
  const close = () => dispatch(closeBrokerModal());

  // Form
  const [form, setForm] = useState({ nic: "", name: "", address: "", city: "", tpNumber: "" });
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (modal === "edit" && selected) {
      setForm({
        nic: selected.nic || "",
        name: selected.name || "",
        address: selected.address || "",
        city: selected.city || "",
        tpNumber: selected.tpNumber || "",
      });
      setFormError("");
    }
    if (modal === "add") {
      setForm({ nic: "", name: "", address: "", city: "", tpNumber: "" });
      setFormError("");
    }
  }, [modal, selected]);

  // ✅ NIC OPTIONAL validation
  const validateForm = () => {
    const nic = String(form.nic || "").trim();
    const name = String(form.name || "").trim();
    const address = String(form.address || "").trim();
    const city = String(form.city || "").trim();
    const tp = String(form.tpNumber || "").trim();

    if (!isNonEmpty(name) || !isNonEmpty(address) || !isNonEmpty(city) || !isNonEmpty(tp)) {
      return "name, address, city, tpNumber are required.";
    }

    // ✅ validate NIC only if typed
    if (nic && !isValidNIC(nic)) {
      return "Invalid NIC. Use 12 digits OR 11 digits + V/X OR 9 digits + V/X.";
    }

    const normalized = normalizePhone(tp);
    if (!normalized) {
      return "Invalid phone. Use 94xxxxxxxxx (9476xxxxxxx) or 0xxxxxxxxx (076xxxxxxx).";
    }

    return null;
  };

  const buildPayload = () => {
    const nic = String(form.nic || "").trim();
    const payload = {
      name: String(form.name).trim(),
      address: String(form.address).trim(),
      city: String(form.city).trim(),
      tpNumber: normalizePhone(form.tpNumber),
    };

    // ✅ send nic only if typed; else do not send (create)
    if (nic) payload.nic = nic;

    return payload;
  };

  const onSubmitAdd = async (e) => {
    e.preventDefault();
    const errMsg = validateForm();
    if (errMsg) return setFormError(errMsg);

    try {
      await createBroker(buildPayload()).unwrap();
      showToast("success", "Broker Added", "Broker created successfully.");
      close();
    } catch (err) {
      showToast("error", "Create Failed", err?.data?.message || "Unable to create broker.");
    }
  };

  const onSubmitEdit = async (e) => {
    e.preventDefault();
    if (!selected?._id) return showToast("error", "Update Failed", "Missing broker id.");

    const errMsg = validateForm();
    if (errMsg) return setFormError(errMsg);

    // ✅ update supports clearing nic: send nic as "" to clear
    const nicTrim = String(form.nic || "").trim();

    const payload = {
      name: String(form.name).trim(),
      address: String(form.address).trim(),
      city: String(form.city).trim(),
      tpNumber: normalizePhone(form.tpNumber),
      nic: nicTrim, // ✅ can be "" to clear on backend
    };

    try {
      await updateBroker({ id: selected._id, payload }).unwrap();
      showToast("success", "Broker Updated", "Broker updated successfully.");
      close();
    } catch (err) {
      showToast("error", "Update Failed", err?.data?.message || "Unable to update broker.");
    }
  };

  const onConfirmDelete = async () => {
    if (!selected?._id) return showToast("error", "Delete Failed", "Missing broker id.");
    try {
      await deleteBroker(selected._id).unwrap();
      showToast("success", "Broker Deleted", "Broker deleted successfully.");
      close();
    } catch (err) {
      showToast("error", "Delete Failed", err?.data?.message || "Unable to delete broker.");
    }
  };

  return (
    <>
      <Toast toast={toast} onClose={() => setToast((t) => ({ ...t, open: false }))} />

      <div className="w-full flex justify-center">
        <div className="w-full max-w-6xl px-3 sm:px-6 py-4 sm:py-6 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-blue-800 text-center">
            Brokers
          </h1>

          {/* SEARCH */}
          <form
            onSubmit={handleSearch}
            className="mt-5 sm:mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2"
          >
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search by NIC / Name"
              className="w-full sm:w-[420px] rounded-xl border border-gray-300 px-3 py-2 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-400"
            />

            <button
              type="submit"
              className="w-full sm:w-auto rounded-lg bg-blue-700 px-4 py-2 text-xs sm:text-sm font-bold text-white hover:bg-blue-800 transition"
            >
              Search
            </button>

            <button
              type="button"
              onClick={clearSearch}
              className="w-full sm:w-auto rounded-lg bg-gray-200 px-4 py-2 text-xs sm:text-sm font-bold text-gray-700 hover:bg-gray-300 transition"
            >
              Clear
            </button>
          </form>

          {/* HEADER + ADD */}
          <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
              Total: <span className="font-bold">{total}</span>
              {loading ? <span className="ml-2 text-blue-700 font-semibold">Loading...</span> : null}
              {listError ? <span className="ml-2 text-red-600 font-semibold">Failed to load</span> : null}
            </p>

            <div className="flex justify-center sm:justify-end">
              <button
                onClick={openAdd}
                className="w-full sm:w-auto rounded-lg bg-green-600 px-4 py-2 text-xs sm:text-sm font-bold text-white hover:bg-green-700 transition"
              >
                + Add Broker
              </button>
            </div>
          </div>

          {/* TABLE */}
          <div className="mt-4 w-full overflow-x-auto bg-white rounded-xl shadow-sm">
            <table className="w-full min-w-[700px]">
              <thead className="hidden sm:table-header-group">
                <tr className="bg-gray-100 text-gray-800 text-sm">
                  <th className="p-3 text-center">NIC</th>
                  <th className="p-3 text-center">Name</th>
                  <th className="p-3 text-center">Address</th>
                  <th className="p-3 text-center">City</th>
                  <th className="p-3 text-center">TP Number</th>
                  <th className="p-3 text-center">Operation</th>
                </tr>
              </thead>

              <tbody className="block sm:table-row-group">
                {loading ? (
                  <tr className="block sm:table-row">
                    <td colSpan={6} className="block sm:table-cell p-6 text-center text-gray-500">
                      Loading brokers...
                    </td>
                  </tr>
                ) : brokers.length === 0 ? (
                  <tr className="block sm:table-row">
                    <td colSpan={6} className="block sm:table-cell p-6 text-center text-gray-500">
                      No brokers found
                    </td>
                  </tr>
                ) : (
                  brokers.map((b) => (
                    <tr
                      key={b._id}
                      className="block sm:table-row mb-3 sm:mb-0 mx-2 sm:mx-0 bg-white rounded-lg sm:border-b border-gray-200"
                    >
                      <td
                        data-label="NIC"
                        className="block sm:table-cell p-3 text-left sm:text-center
                        before:content-[attr(data-label)] before:block sm:before:hidden
                        before:text-[10px] before:text-gray-500 before:mb-1 font-semibold"
                      >
                        {b.nic || "-"}
                      </td>

                      <td data-label="Name" className="block sm:table-cell p-3 text-left sm:text-center before:content-[attr(data-label)] before:block sm:before:hidden before:text-[10px] before:text-gray-500 before:mb-1">
                        {b.name}
                      </td>

                      <td data-label="Address" className="block sm:table-cell p-3 text-left sm:text-center before:content-[attr(data-label)] before:block sm:before:hidden before:text-[10px] before:text-gray-500 before:mb-1">
                        {b.address}
                      </td>

                      <td data-label="City" className="block sm:table-cell p-3 text-left sm:text-center before:content-[attr(data-label)] before:block sm:before:hidden before:text-[10px] before:text-gray-500 before:mb-1">
                        {b.city}
                      </td>

                      <td data-label="TP Number" className="block sm:table-cell p-3 text-left sm:text-center before:content-[attr(data-label)] before:block sm:before:hidden before:text-[10px] before:text-gray-500 before:mb-1">
                        {b.tpNumber}
                      </td>

                      <td data-label="Operation" className="block sm:table-cell p-3 text-left sm:text-center before:content-[attr(data-label)] before:block sm:before:hidden before:text-[10px] before:text-gray-500 before:mb-2">
                        <div className="flex justify-start sm:justify-center gap-1 sm:gap-2">
                          <button onClick={() => openView(b)} className="rounded-md bg-blue-600 px-2 py-1 text-white text-[10px] sm:text-sm font-bold">
                            View
                          </button>
                          <button onClick={() => openEdit(b)} className="rounded-md bg-yellow-500 px-2 py-1 text-white text-[10px] sm:text-sm font-bold">
                            Update
                          </button>
                          <button onClick={() => openDelete(b)} className="rounded-md bg-red-600 px-2 py-1 text-white text-[10px] sm:text-sm font-bold">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <p className="mt-2 text-center text-[10px] text-gray-500 sm:hidden">
            Scroll left/right if needed.
          </p>
        </div>
      </div>

      {/* ADD */}
      {modal === "add" && (
        <ModalShell title="Add Broker" onClose={close}>
          <form onSubmit={onSubmitAdd} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-700">NIC (Optional)</label>
                <input
                  value={form.nic}
                  onChange={(e) => setForm((p) => ({ ...p, nic: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Broker name"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-gray-700">Address</label>
                <input
                  value={form.address}
                  onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="No 12, Main Road"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700">City</label>
                <input
                  value={form.city}
                  onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Colombo"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700">TP Number</label>
                <input
                  value={form.tpNumber}
                  onChange={(e) => setForm((p) => ({ ...p, tpNumber: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="0765556575 or 94765556575"
                />
              </div>
            </div>

            {formError ? <p className="text-xs text-red-600 font-semibold">{formError}</p> : null}

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={close} className="rounded-xl bg-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-300">
                Cancel
              </button>
              <button type="submit" disabled={creating} className="rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60">
                {creating ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* VIEW */}
      {modal === "view" && selected && (
        <ModalShell title="Broker Details" onClose={close}>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">NIC</span>
              <span className="font-bold">{selected.nic || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Name</span>
              <span className="font-bold">{selected.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Address</span>
              <span className="font-bold">{selected.address}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">City</span>
              <span className="font-bold">{selected.city}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">TP</span>
              <span className="font-bold">{selected.tpNumber}</span>
            </div>
          </div>
        </ModalShell>
      )}

      {/* EDIT */}
      {modal === "edit" && selected && (
        <ModalShell title="Update Broker" onClose={close}>
          <form onSubmit={onSubmitEdit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-700">NIC (Optional)</label>
                <input
                  value={form.nic}
                  onChange={(e) => setForm((p) => ({ ...p, nic: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Optional (clear to remove)"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-gray-700">Address</label>
                <input
                  value={form.address}
                  onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700">City</label>
                <input
                  value={form.city}
                  onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700">TP Number</label>
                <input
                  value={form.tpNumber}
                  onChange={(e) => setForm((p) => ({ ...p, tpNumber: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>

            {formError ? <p className="text-xs text-red-600 font-semibold">{formError}</p> : null}

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={close} className="rounded-xl bg-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-300">
                Cancel
              </button>
              <button type="submit" disabled={updating} className="rounded-xl bg-yellow-500 px-4 py-2 text-sm font-bold text-white hover:bg-yellow-600 disabled:opacity-60">
                {updating ? "Updating..." : "Update"}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* DELETE */}
      {modal === "delete" && selected && (
        <ModalShell title="Delete Broker" onClose={close}>
          <p className="text-sm text-gray-700">
            Are you sure you want to delete{" "}
            <span className="font-extrabold text-red-700">{selected.name}</span>?
          </p>

          <div className="mt-4 flex gap-2">
            <button onClick={close} className="w-full rounded-xl bg-gray-200 px-4 py-2 font-extrabold text-gray-800 hover:bg-gray-300">
              Cancel
            </button>
            <button
              onClick={onConfirmDelete}
              disabled={deleting}
              className="w-full rounded-xl bg-red-600 px-4 py-2 font-extrabold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {deleting ? "Deleting..." : "Yes, Delete"}
            </button>
          </div>
        </ModalShell>
      )}
    </>
  );
};

export default BrokerPage;
