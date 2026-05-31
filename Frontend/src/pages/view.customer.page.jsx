import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  useGetCustomersQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useDeleteCustomerMutation,
} from "../api/customerApi";
import { openModal, closeModal } from "../api/features/customerSlice.js";

/* -------------------- Small Helpers -------------------- */

const toast = (msg) => alert(msg);

const textValue = (value) => String(value || "").toLowerCase().trim();

const phoneValue = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/-/g, "")
    .trim();

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

const CustomerForm = ({ initial, onSubmit, isLoading, isEdit = false }) => {
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

        const payload = {
          name: name.trim(),
          address: address.trim(),
          city: city.trim(),
          tpNumber: tpNumber.trim(),
        };

        // Add page: NIC is optional, so do not send empty NIC.
        // Edit page: send empty NIC also, so user can remove NIC.
        if (isEdit || nic.trim()) {
          payload.nic = nic.trim();
        }

        onSubmit(payload);
      }}
      className="space-y-3"
    >
      <div>
        <label className="text-sm text-gray-700">NIC Optional</label>
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
        className="w-full rounded-xl bg-blue-700 px-4 py-2 font-extrabold text-white hover:bg-blue-800 disabled:opacity-60"
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

  const [nameNicSearch, setNameNicSearch] = useState("");
  const [tpSearch, setTpSearch] = useState("");

  const {
    data: listRes,
    isLoading: loadingList,
    error: listError,
  } = useGetCustomersQuery();

  const [createCustomer, { isLoading: creating }] = useCreateCustomerMutation();
  const [updateCustomer, { isLoading: updating }] = useUpdateCustomerMutation();
  const [deleteCustomer, { isLoading: deleting }] = useDeleteCustomerMutation();

  const allCustomers = listRes?.data || [];

  const customers = useMemo(() => {
    const nameNicText = textValue(nameNicSearch);
    const tpText = phoneValue(tpSearch);

    return allCustomers.filter((customer) => {
      const customerName = textValue(customer.name);
      const customerNic = textValue(customer.nic);
      const customerTp = phoneValue(customer.tpNumber);

      const matchNameOrNic =
        !nameNicText ||
        customerName.includes(nameNicText) ||
        customerNic.includes(nameNicText);

      const matchTp = !tpText || customerTp.includes(tpText);

      return matchNameOrNic && matchTp;
    });
  }, [allCustomers, nameNicSearch, tpSearch]);

  const close = () => dispatch(closeModal());

  const handleSearch = (e) => {
    e.preventDefault();
  };

  const handleClear = () => {
    setNameNicSearch("");
    setTpSearch("");
  };

  const onCreate = async (payload) => {
    try {
      const res = await createCustomer(payload).unwrap();

      if (res?.success) {
        close();
        toast("Customer created successfully");
      } else {
        toast(res?.message || "Create failed");
      }
    } catch (err) {
      toast(err?.data?.message || "Create failed");
    }
  };

  const onUpdate = async (payload) => {
    try {
      if (!selected?._id) {
        toast("Customer ID not found");
        return;
      }

      const res = await updateCustomer({
        id: selected._id,
        payload,
      }).unwrap();

      if (res?.success) {
        close();
        toast("Customer updated successfully");
      } else {
        toast(res?.message || "Update failed");
      }
    } catch (err) {
      toast(err?.data?.message || "Update failed");
    }
  };

  const onDelete = async () => {
    try {
      if (!selected?._id) {
        toast("Customer ID not found");
        return;
      }

      const res = await deleteCustomer(selected._id).unwrap();

      if (res?.success) {
        close();
        toast("Customer deleted successfully");
      } else {
        toast(res?.message || "Delete failed");
      }
    } catch (err) {
      toast(err?.data?.message || "Delete failed");
    }
  };

  return (
    <div className="flex w-full justify-center">
      <div className="w-full max-w-6xl min-w-0 px-3 py-4 sm:px-6 sm:py-6">
        <h1 className="text-center text-2xl font-extrabold text-blue-800 sm:text-3xl">
          Customers
        </h1>

        {/* SEARCH */}
        <form
          onSubmit={handleSearch}
          className="mt-5 flex flex-col items-stretch justify-center gap-2 sm:mt-6 sm:flex-row sm:items-center"
        >
          <input
            type="text"
            value={nameNicSearch}
            onChange={(e) => setNameNicSearch(e.target.value)}
            placeholder="Search by Name or NIC"
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-400 sm:w-[360px] sm:text-sm"
          />

          <input
            type="text"
            value={tpSearch}
            onChange={(e) => setTpSearch(e.target.value)}
            placeholder="Search by TP Number"
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-400 sm:w-[260px] sm:text-sm"
          />

          <button
            type="submit"
            className="w-full rounded-lg bg-blue-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-800 sm:w-auto sm:text-sm"
          >
            Search
          </button>

          <button
            type="button"
            onClick={handleClear}
            className="w-full rounded-lg bg-gray-200 px-4 py-2 text-xs font-bold text-gray-800 transition hover:bg-gray-300 sm:w-auto sm:text-sm"
          >
            Clear
          </button>
        </form>

        {/* HEADER + ADD */}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-center text-xs text-gray-600 sm:text-left sm:text-sm">
            Total: <span className="font-bold">{customers.length}</span>
          </p>

          <div className="flex justify-center sm:justify-end">
            <button
              onClick={() => dispatch(openModal({ modal: "add" }))}
              className="w-full rounded-lg bg-green-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-green-700 sm:w-auto sm:text-sm"
            >
              + Add Customer
            </button>
          </div>
        </div>

        {/* TABLE */}
        <div className="mt-4 w-full overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full min-w-[900px]">
            <thead className="hidden sm:table-header-group">
              <tr className="bg-gray-100 text-sm text-gray-800">
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
                  <td
                    colSpan="6"
                    className="block p-6 text-center text-gray-500 sm:table-cell"
                  >
                    Loading...
                  </td>
                </tr>
              ) : listError ? (
                <tr className="block sm:table-row">
                  <td
                    colSpan="6"
                    className="block p-6 text-center text-red-500 sm:table-cell"
                  >
                    Failed to load customers
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr className="block sm:table-row">
                  <td
                    colSpan="6"
                    className="block p-6 text-center text-gray-500 sm:table-cell"
                  >
                    No customers found
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr
                    key={customer._id}
                    className="mx-2 mb-3 block rounded-lg border-gray-200 bg-white sm:mx-0 sm:mb-0 sm:table-row sm:border-b"
                  >
                    <td
                      data-label="NIC"
                      className="block p-3 text-left font-semibold before:mb-1 before:block before:text-[10px] before:text-gray-500 before:content-[attr(data-label)] sm:table-cell sm:text-center sm:before:hidden"
                    >
                      {customer.nic || "-"}
                    </td>

                    <td
                      data-label="Name"
                      className="block p-3 text-left before:mb-1 before:block before:text-[10px] before:text-gray-500 before:content-[attr(data-label)] sm:table-cell sm:text-center sm:before:hidden"
                    >
                      {customer.name}
                    </td>

                    <td
                      data-label="Address"
                      className="block p-3 text-left before:mb-1 before:block before:text-[10px] before:text-gray-500 before:content-[attr(data-label)] sm:table-cell sm:text-center sm:before:hidden"
                    >
                      {customer.address}
                    </td>

                    <td
                      data-label="City"
                      className="block p-3 text-left before:mb-1 before:block before:text-[10px] before:text-gray-500 before:content-[attr(data-label)] sm:table-cell sm:text-center sm:before:hidden"
                    >
                      {customer.city}
                    </td>

                    <td
                      data-label="TP Number"
                      className="block p-3 text-left before:mb-1 before:block before:text-[10px] before:text-gray-500 before:content-[attr(data-label)] sm:table-cell sm:text-center sm:before:hidden"
                    >
                      {customer.tpNumber}
                    </td>

                    <td
                      data-label="Operation"
                      className="block p-3 text-left before:mb-2 before:block before:text-[10px] before:text-gray-500 before:content-[attr(data-label)] sm:table-cell sm:text-center sm:before:hidden"
                    >
                      <div className="flex justify-start gap-1 sm:justify-center sm:gap-2">
                        <button
                          onClick={() =>
                            dispatch(
                              openModal({
                                modal: "view",
                                customer,
                              })
                            )
                          }
                          className="rounded-md bg-blue-600 px-2 py-1 text-[10px] font-bold text-white sm:text-sm"
                        >
                          View
                        </button>

                        <button
                          onClick={() =>
                            dispatch(
                              openModal({
                                modal: "edit",
                                customer,
                              })
                            )
                          }
                          className="rounded-md bg-yellow-500 px-2 py-1 text-[10px] font-bold text-white sm:text-sm"
                        >
                          Update
                        </button>

                        <button
                          onClick={() =>
                            dispatch(
                              openModal({
                                modal: "delete",
                                customer,
                              })
                            )
                          }
                          className="rounded-md bg-red-600 px-2 py-1 text-[10px] font-bold text-white sm:text-sm"
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
          <CustomerForm
            initial={null}
            onSubmit={onCreate}
            isLoading={creating}
          />
        </ModalShell>
      )}

      {/* VIEW MODAL */}
      {modal === "view" && selected && (
        <ModalShell title="Customer Details" onClose={close}>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">NIC</span>
              <span className="font-bold">{selected.nic || "-"}</span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Name</span>
              <span className="font-bold">{selected.name}</span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Address</span>
              <span className="font-bold">{selected.address}</span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-gray-500">City</span>
              <span className="font-bold">{selected.city}</span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-gray-500">TP</span>
              <span className="font-bold">{selected.tpNumber}</span>
            </div>

            <button
              onClick={() =>
                dispatch(
                  openModal({
                    modal: "edit",
                    customer: selected,
                  })
                )
              }
              className="mt-4 w-full rounded-xl bg-yellow-500 px-4 py-2 font-extrabold text-white hover:bg-yellow-600"
            >
              Update
            </button>
          </div>
        </ModalShell>
      )}

      {/* EDIT MODAL */}
      {modal === "edit" && selected && (
        <ModalShell title="Update Customer" onClose={close}>
          <CustomerForm
            initial={selected}
            onSubmit={onUpdate}
            isLoading={updating}
            isEdit={true}
          />

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