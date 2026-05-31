import React, { useMemo, useState } from "react";
import { useGetAssetFlowQuery } from "../api/assetApi";

const money = (n) => Number(n || 0).toLocaleString("en-LK");

const cleanText = (value) => String(value || "").toLowerCase().trim();

const StatusPill = ({ status }) => {
  const map = {
    finished: {
      text: "Payment Finished",
      cls: "bg-green-100 text-green-800 border-green-200",
    },
    pending: {
      text: "Payment Pending",
      cls: "bg-yellow-100 text-yellow-800 border-yellow-200",
    },
    arrears: {
      text: "Payment Arrears",
      cls: "bg-red-100 text-red-800 border-red-200",
    },
  };

  const s = map[status] || map.pending;

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full border text-[11px] font-extrabold ${s.cls}`}
    >
      {s.text}
    </span>
  );
};

const arrearsLabel = (value) => {
  if (value === "1") return "1 Month";
  if (value === "2") return "2 Months";
  if (value === "3") return "3 Months";
  if (value === "more3") return "More than 3 Months";
  if (value === "finished") return "Finished";
  return "-";
};

const ViewAssetpage = () => {
  const [assetNameText, setAssetNameText] = useState("");
  const [customerText, setCustomerText] = useState("");
  const [brokerText, setBrokerText] = useState("");
  const [arrearsPeriod, setArrearsPeriod] = useState("all");

  const [searchFilters, setSearchFilters] = useState({
    assetName: "",
    customer: "",
    broker: "",
    arrearsPeriod: "all",
  });

  const { data, isLoading, isError, refetch } = useGetAssetFlowQuery(30);

  const rows = data?.data || [];

  const filteredRows = useMemo(() => {
    const assetSearch = cleanText(searchFilters.assetName);
    const customerSearch = cleanText(searchFilters.customer);
    const brokerSearch = cleanText(searchFilters.broker);
    const arrearsSearch = searchFilters.arrearsPeriod;

    return rows.filter((row) => {
      const assetName = cleanText(row?.assetName);

      const customerName = cleanText(row?.customer?.name);
      const customerNic = cleanText(row?.customer?.nic);

      const brokerName = cleanText(row?.broker?.name);
      const brokerNic = cleanText(row?.broker?.nic);

      const rowArrearsPeriod = row?.arrearsMonthGroup || "";

      const matchAsset =
        !assetSearch || assetName.includes(assetSearch);

      const matchCustomer =
        !customerSearch ||
        customerName.includes(customerSearch) ||
        customerNic.includes(customerSearch);

      const matchBroker =
        !brokerSearch ||
        brokerName.includes(brokerSearch) ||
        brokerNic.includes(brokerSearch);

      const matchArrears =
        arrearsSearch === "all" || rowArrearsPeriod === arrearsSearch;

      return matchAsset && matchCustomer && matchBroker && matchArrears;
    });
  }, [rows, searchFilters]);

  const handleSearch = (e) => {
    e.preventDefault();

    setSearchFilters({
      assetName: assetNameText,
      customer: customerText,
      broker: brokerText,
      arrearsPeriod,
    });
  };

  const handleClear = () => {
    setAssetNameText("");
    setCustomerText("");
    setBrokerText("");
    setArrearsPeriod("all");

    setSearchFilters({
      assetName: "",
      customer: "",
      broker: "",
      arrearsPeriod: "all",
    });
  };

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-7xl px-3 sm:px-6 py-4 sm:py-6 min-w-0">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-blue-800 text-center">
          View Assets
        </h1>

        {/* SEARCH FILTERS */}
        <form
          onSubmit={handleSearch}
          className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-2"
        >
          <input
            value={assetNameText}
            onChange={(e) => setAssetNameText(e.target.value)}
            placeholder="Search by Asset Name"
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-400"
          />

          <input
            value={customerText}
            onChange={(e) => setCustomerText(e.target.value)}
            placeholder="Customer Name or Customer NIC"
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-400"
          />

          <input
            value={brokerText}
            onChange={(e) => setBrokerText(e.target.value)}
            placeholder="Broker Name or Broker NIC"
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-400"
          />

          <select
            value={arrearsPeriod}
            onChange={(e) => setArrearsPeriod(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="all">All Arrears Periods</option>
            <option value="1">1 Month</option>
            <option value="2">2 Months</option>
            <option value="3">3 Months</option>
            <option value="more3">More than 3 Months</option>
          </select>

          <div className="flex gap-2">
            <button
              type="submit"
              className="w-full rounded-lg bg-blue-700 px-4 py-2 text-xs sm:text-sm font-bold text-white hover:bg-blue-800 transition"
            >
              Search
            </button>

            <button
              type="button"
              onClick={handleClear}
              className="w-full rounded-lg bg-gray-200 px-4 py-2 text-xs sm:text-sm font-bold text-gray-800 hover:bg-gray-300 transition"
            >
              Clear
            </button>
          </div>
        </form>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
            Total: <span className="font-bold">{filteredRows.length}</span>
          </p>

          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-lg bg-green-600 px-4 py-2 text-xs sm:text-sm font-bold text-white hover:bg-green-700 transition"
          >
            Refresh
          </button>
        </div>

        {isLoading && (
          <div className="mt-6 text-center text-sm text-gray-500">
            Loading...
          </div>
        )}

        {isError && (
          <div className="mt-6 text-center text-sm text-red-600">
            Error loading Asset Flow. Check backend: <b>/api/assets/flow</b>
          </div>
        )}

        {!isLoading && !isError && (
          <div className="mt-6 bg-white rounded-xl shadow-sm min-w-0 overflow-x-auto">
            <table className="w-full min-w-[1150px]">
              <thead className="hidden sm:table-header-group">
                <tr className="bg-gray-100 text-sm text-gray-800">
                  <th className="p-3 text-center">Asset Name</th>
                  <th className="p-3 text-center">Customer</th>
                  <th className="p-3 text-center">Broker</th>
                  <th className="p-3 text-center">Estimate Amount</th>
                  <th className="p-3 text-center">Invest Amount</th>
                  <th className="p-3 text-center">Customer Paid</th>
                  <th className="p-3 text-center">Pending</th>
                  <th className="p-3 text-center">Arrears Period</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>

              <tbody className="block sm:table-row-group">
                {filteredRows.length === 0 ? (
                  <tr className="block sm:table-row">
                    <td
                      className="block sm:table-cell p-6 text-center text-gray-500"
                      colSpan={9}
                    >
                      No assets found
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => {
                    const isArrears = row.paymentStatus === "arrears";

                    return (
                      <tr
                        key={row._id}
                        className={[
                          "block sm:table-row border-b sm:border-gray-200 px-2 sm:px-0",
                          isArrears ? "bg-red-50" : "bg-white",
                        ].join(" ")}
                      >
                        <td
                          data-label="Asset Name"
                          className="block sm:table-cell p-3 text-left sm:text-center before:content-[attr(data-label)] before:block sm:before:hidden before:text-[10px] before:text-gray-500 before:mb-1"
                        >
                          <div className="font-semibold">
                            {row.assetName || "-"}
                          </div>
                        </td>

                        <td
                          data-label="Customer"
                          className="block sm:table-cell p-3 text-left sm:text-center before:content-[attr(data-label)] before:block sm:before:hidden before:text-[10px] before:text-gray-500 before:mb-1"
                        >
                          <div className="leading-tight">
                            <div className="font-semibold">
                              {row?.customer?.name || "-"}
                            </div>
                            <div className="text-[11px] text-gray-500">
                              {row?.customer?.nic || "-"}
                            </div>
                          </div>
                        </td>

                        <td
                          data-label="Broker"
                          className="block sm:table-cell p-3 text-left sm:text-center before:content-[attr(data-label)] before:block sm:before:hidden before:text-[10px] before:text-gray-500 before:mb-1"
                        >
                          <div className="leading-tight">
                            <div className="font-semibold">
                              {row?.broker?.name || "-"}
                            </div>
                            <div className="text-[11px] text-gray-500">
                              {row?.broker?.nic || "-"}
                            </div>
                          </div>
                        </td>

                        <td
                          data-label="Estimate Amount"
                          className="block sm:table-cell p-3 text-left sm:text-center before:content-[attr(data-label)] before:block sm:before:hidden before:text-[10px] before:text-gray-500 before:mb-1"
                        >
                          Rs. {money(row.estimateAmount)}
                        </td>

                        <td
                          data-label="Invest Amount"
                          className="block sm:table-cell p-3 text-left sm:text-center before:content-[attr(data-label)] before:block sm:before:hidden before:text-[10px] before:text-gray-500 before:mb-1"
                        >
                          Rs. {money(row.investmentAmount)}
                        </td>

                        <td
                          data-label="Customer Paid"
                          className="block sm:table-cell p-3 text-left sm:text-center before:content-[attr(data-label)] before:block sm:before:hidden before:text-[10px] before:text-gray-500 before:mb-1"
                        >
                          Rs. {money(row.totalCustomerPaid)}
                        </td>

                        <td
                          data-label="Pending"
                          className="block sm:table-cell p-3 text-left sm:text-center before:content-[attr(data-label)] before:block sm:before:hidden before:text-[10px] before:text-gray-500 before:mb-1"
                        >
                          Rs. {money(row.pendingPayment)}
                        </td>

                        <td
                          data-label="Arrears Period"
                          className="block sm:table-cell p-3 text-left sm:text-center before:content-[attr(data-label)] before:block sm:before:hidden before:text-[10px] before:text-gray-500 before:mb-1"
                        >
                          {arrearsLabel(row.arrearsMonthGroup)}
                        </td>

                        <td
                          data-label="Status"
                          className="block sm:table-cell p-3 text-left sm:text-center before:content-[attr(data-label)] before:block sm:before:hidden before:text-[10px] before:text-gray-500 before:mb-1"
                        >
                          <div className="flex justify-start sm:justify-center">
                            <StatusPill status={row.paymentStatus} />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && !isError && (
          <div className="mt-4 text-xs text-gray-500 text-center">
            Arrears period is calculated from the last customer payment date. If
            there is no payment yet, it is calculated from the investment start
            date.
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewAssetpage;