import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  useGetCustomersQuery,
  useLazySearchCustomersQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useDeleteCustomerMutation,
} from "../api/customerApi";
import { openModal, closeModal } from "../api/features/customerSlice.js"

/* -------------------- Small Helpers -------------------- */

const toast = (msg) => alert(msg);

const ModalShell = ({ title, children, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
    <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <h3 className="text-lg font-extrabold text-blue-800">{title}</h3>
        <button
          onClick={onClose}
          className="rounded-lg px-3 py-1 text-sm font-bold text-gray-600 hover:bg-gray-100"
        >
          ✕
        </button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);

const CustomerForm = ({ initial, onSubmit, isLoading }) => {
  const [nic, setNic] = useState(initial?.nic || "");
  const [name, setName] = useState(initial?.name || "");
  const [address, setAddress] = useState(initial?.address || "");
  const [city, setCity] = useState(initial?.city || "");
  const [tpNumber, setTpNumber] = useState(initial?.tpNumber || "");

  useEffect(() => {
    setNic(initial?.nic || "");
    setName(initial?.name || "");
    setAddress(initial?.address || "");
    setCity(initial?.city || "");
    setTpNumber(initial?.tpNumber || "");
  }, [initial]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();

        // ✅ NIC optional: only send if typed
        const payload = {
          ...(nic.trim() ? { nic } : {}),
          name,
          address,
          city,
          tpNumber,
        };

        onSubmit(payload);
      }}
      className="space-y-3"
    >
      <div>
        <label className="text-sm text-gray-700">NIC (Optional)</label>
        <input
          value={nic}
          onChange={(e) => setNic(e.target.value)}
          className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Optional: 200110801867 or 94674433786V"
        />
      </div>

      <div>
        <label className="text-sm text-gray-700">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Customer name"
          required
        />
      </div>

      <div>
        <label className="text-sm text-gray-700">Address</label>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="No 12, Main Road"
          required
        />
      </div>

      <div>
        <label className="text-sm text-gray-700">City</label>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Colombo"
          required
        />
      </div>

      <div>
        <label className="text-sm text-gray-700">TP Number</label>
        <input
          value={tpNumber}
          onChange={(e) => setTpNumber(e.target.value)}
          className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="0765556575 or 94765556575"
          required
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-xl bg-blue-700 px-4 py-2 text-white font-extrabold hover:bg-blue-800 disabled:opacity-60"
      >
        {isLoading ? "Saving..." : "Save"}
      </button>
    </form>
  );
};

/* -------------------- Page -------------------- */

export default function CustomerPage() {
  const dispatch = useDispatch();
  const { modal, selected } = useSelector((s) => s.customer);

  const [searchText, setSearchText] = useState("");

  // Default list
  const { data: listRes, isLoading: loadingList, error: listError } =
    useGetCustomersQuery();

  // Search
  const [triggerSearch, { data: searchRes, isFetching: loadingSearch }] =
    useLazySearchCustomersQuery();

  const [createCustomer, { isLoading: creating }] = useCreateCustomerMutation();
  const [updateCustomer, { isLoading: updating }] = useUpdateCustomerMutation();
  const [deleteCustomer, { isLoading: deleting }] = useDeleteCustomerMutation();

  const customers = useMemo(() => {
    if (searchText.trim() && searchRes?.data) return searchRes.data;
    return listRes?.data || [];
  }, [listRes, searchRes, searchText]);

  const close = () => dispatch(closeModal());

  const handleSearch = async (e) => {
    e.preventDefault();
    const q = searchText.trim();
    if (!q) return;

    // ✅ if contains number -> treat as NIC search, else name
    const isNicLike = /[0-9]/.test(q);
    try {
      await triggerSearch({ nic: isNicLike ? q : "", name: !isNicLike ? q : "" });
    } catch {
      toast("Search failed");
    }
  };

  const handleClear = () => {
    setSearchText("");
  };

  const onCreate = async (payload) => {
    try {
      const res = await createCustomer(payload).unwrap();
      if (res?.success) close();
      else toast(res?.message || "Create failed");
    } catch (err) {
      toast(err?.data?.message || "Create failed");
    }
  };

  const onUpdate = async (payload) => {
    try {
      const res = await updateCustomer({ id: selected?._id, payload }).unwrap();
      if (res?.success) close();
      else toast(res?.message || "Update failed");
    } catch (err) {
      toast(err?.data?.message || "Update failed");
    }
  };

  const onDelete = async () => {
    try {
      const res = await deleteCustomer(selected?._id).unwrap();
      if (res?.success) close();
      else toast(res?.message || "Delete failed");
    } catch (err) {
      toast(err?.data?.message || "Delete failed");
    }
  };

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-6xl px-3 sm:px-6 py-4 sm:py-6 min-w-0">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-blue-800 text-center">
          Customers
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
            {loadingSearch ? "Searching..." : "Search"}
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="w-full sm:w-auto rounded-lg bg-gray-200 px-4 py-2 text-xs sm:text-sm font-bold text-gray-800 hover:bg-gray-300 transition"
          >
            Clear
          </button>
        </form>

        {/* HEADER + ADD */}
        <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
            Total: <span className="font-bold">{customers.length}</span>
          </p>

          <div className="flex justify-center sm:justify-end">
            <button
              onClick={() => dispatch(openModal({ modal: "add" }))}
              className="w-full sm:w-auto rounded-lg bg-green-600 px-4 py-2 text-xs sm:text-sm font-bold text-white hover:bg-green-700 transition"
            >
              + Add Customer
            </button>
          </div>
        </div>

        {/* TABLE */}
        <div className="mt-4 w-full overflow-x-auto bg-white rounded-xl shadow-sm">
          <table className="w-full min-w-[900px]">
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
              {loadingList ? (
                <tr className="block sm:table-row">
                  <td className="block sm:table-cell p-6 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : listError ? (
                <tr className="block sm:table-row">
                  <td className="block sm:table-cell p-6 text-center text-red-500">
                    Failed to load customers
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr className="block sm:table-row">
                  <td className="block sm:table-cell p-6 text-center text-gray-500">
                    No customers found
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr
                    key={c._id}
                    className="block sm:table-row mb-3 sm:mb-0 mx-2 sm:mx-0 bg-white rounded-lg sm:border-b border-gray-200"
                  >
                    <td
                      data-label="NIC"
                      className="block sm:table-cell p-3 text-left sm:text-center
                      before:content-[attr(data-label)] before:block sm:before:hidden
                      before:text-[10px] before:text-gray-500 before:mb-1 font-semibold"
                    >
                      {c.nic || "-"}
                    </td>

                    <td
                      data-label="Name"
                      className="block sm:table-cell p-3 text-left sm:text-center
                      before:content-[attr(data-label)] before:block sm:before:hidden
                      before:text-[10px] before:text-gray-500 before:mb-1"
                    >
                      {c.name}
                    </td>

                    <td
                      data-label="Address"
                      className="block sm:table-cell p-3 text-left sm:text-center
                      before:content-[attr(data-label)] before:block sm:before:hidden
                      before:text-[10px] before:text-gray-500 before:mb-1"
                    >
                      {c.address}
                    </td>

                    <td
                      data-label="City"
                      className="block sm:table-cell p-3 text-left sm:text-center
                      before:content-[attr(data-label)] before:block sm:before:hidden
                      before:text-[10px] before:text-gray-500 before:mb-1"
                    >
                      {c.city}
                    </td>

                    <td
                      data-label="TP Number"
                      className="block sm:table-cell p-3 text-left sm:text-center
                      before:content-[attr(data-label)] before:block sm:before:hidden
                      before:text-[10px] before:text-gray-500 before:mb-1"
                    >
                      {c.tpNumber}
                    </td>

                    <td
                      data-label="Operation"
                      className="block sm:table-cell p-3 text-left sm:text-center
                      before:content-[attr(data-label)] before:block sm:before:hidden
                      before:text-[10px] before:text-gray-500 before:mb-2"
                    >
                      <div className="flex justify-start sm:justify-center gap-1 sm:gap-2">
                        <button
                          onClick={() =>
                            dispatch(openModal({ modal: "view", customer: c }))
                          }
                          className="rounded-md bg-blue-600 px-2 py-1 text-white text-[10px] sm:text-sm font-bold"
                        >
                          View
                        </button>
                        <button
                          onClick={() =>
                            dispatch(openModal({ modal: "edit", customer: c }))
                          }
                          className="rounded-md bg-yellow-500 px-2 py-1 text-white text-[10px] sm:text-sm font-bold"
                        >
                          Update
                        </button>
                        <button
                          onClick={() =>
                            dispatch(openModal({ modal: "delete", customer: c }))
                          }
                          className="rounded-md bg-red-600 px-2 py-1 text-white text-[10px] sm:text-sm font-bold"
                        >
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

      {/* ADD MODAL */}
      {modal === "add" && (
        <ModalShell title="Add Customer" onClose={close}>
          <CustomerForm initial={null} onSubmit={onCreate} isLoading={creating} />
        </ModalShell>
      )}

      {/* VIEW MODAL */}
      {modal === "view" && selected && (
        <ModalShell title="Customer Details" onClose={close}>
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

            <button
              onClick={() =>
                dispatch(openModal({ modal: "edit", customer: selected }))
              }
              className="mt-4 w-full rounded-xl bg-yellow-500 px-4 py-2 text-white font-extrabold hover:bg-yellow-600"
            >
              Update
            </button>
          </div>
        </ModalShell>
      )}

      {/* EDIT MODAL */}
      {modal === "edit" && selected && (
        <ModalShell title="Update Customer" onClose={close}>
          <CustomerForm initial={selected} onSubmit={onUpdate} isLoading={updating} />
          <p className="mt-2 text-[11px] text-gray-500">
            Tip: To remove NIC, clear the NIC field and save.
          </p>
        </ModalShell>
      )}

      {/* DELETE MODAL */}
      {modal === "delete" && selected && (
        <ModalShell title="Delete Customer" onClose={close}>
          <p className="text-sm text-gray-700">
            Are you sure you want to delete{" "}
            <span className="font-extrabold">{selected.name}</span>?
          </p>

          <div className="mt-4 flex gap-2">
            <button
              onClick={close}
              className="w-full rounded-xl bg-gray-200 px-4 py-2 font-extrabold text-gray-800 hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={onDelete}
              disabled={deleting}
              className="w-full rounded-xl bg-red-600 px-4 py-2 font-extrabold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {deleting ? "Deleting..." : "Yes, Delete"}
            </button>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
