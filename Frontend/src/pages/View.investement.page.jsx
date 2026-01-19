import React, { useMemo, useState } from "react";
import { useGetInvestmentsQuery } from "../api/investmentApi";

const formatMoney = (n) => Number(n || 0).toLocaleString("en-LK");
const safe = (v) => (v === undefined || v === null || v === "" ? "-" : v);

const formatDateTime = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-LK", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const ViewInvestementpage = () => {
  const [searchText, setSearchText] = useState("");

  const { data, isLoading, error } = useGetInvestmentsQuery();
  const investmentsRaw = data?.data || [];

  const investments = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return investmentsRaw;

    return investmentsRaw.filter((inv) => {
      const customer = inv?.customerId || {};
      const broker = inv?.brokerId || {};
      const asset = inv?.assetId || {};

      const hay = [
        customer?.nic,
        customer?.name,
        broker?.nic,
        broker?.name,
        asset?.assetName,
        asset?.assetType,
        asset?.assetDescription,
        asset?.vehicleNumber,
        asset?.landAddress,
        inv?.investmentAmount,
        inv?.investmentDurationMonths,
        inv?.investmentInterestRate,
        inv?.brokerCommissionRate,
        inv?.description,
        inv?._id,
        inv?.createdAt,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [investmentsRaw, searchText]);

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-7xl px-3 sm:px-6 py-4 sm:py-6 min-w-0">
        <h1 className="text-2xl sm:text-3xl text-blue-800 text-center font-extrabold">
          View Investments
        </h1>

        

        {/* SEARCH */}
        <form
          onSubmit={(e) => e.preventDefault()}
          className="mt-5 flex flex-col sm:flex-row justify-center gap-2"
        >
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search by Customer NIC/Name, Broker NIC/Name, Asset, Amount..."
            className="w-full sm:w-[560px] rounded-xl border px-3 py-2 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={() => setSearchText("")}
            className="rounded-lg bg-gray-200 px-4 py-2 text-xs sm:text-sm text-gray-800"
          >
            Clear
          </button>
          <div className="mt-3 text-center text-[11px] text-gray-500">
          Total: {investments.length}
        </div>
        </form>

        {/* TABLE */}
        <div className="mt-6 bg-white rounded-xl shadow-sm min-w-0 overflow-x-auto">
          <table className="w-full min-w-[1200px]">
            <thead className="hidden sm:table-header-group">
              <tr className="bg-gray-100 text-sm text-gray-800">
                <th className="p-3 text-center">Customer</th>
                <th className="p-3 text-center">Broker</th>
                <th className="p-3 text-center">Asset</th>
                <th className="p-3 text-center">Estimate</th>
                <th className="p-3 text-center">Investment</th>
                <th className="p-3 text-center">Duration</th>
                <th className="p-3 text-center">Interest %</th>
                <th className="p-3 text-center">Commission %</th>
                <th className="p-3 text-center">Created</th>
              </tr>
            </thead>

            <tbody className="block sm:table-row-group">
              {isLoading ? (
                <tr className="block sm:table-row">
                  <td className="block sm:table-cell p-6 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : error ? (
                <tr className="block sm:table-row">
                  <td className="block sm:table-cell p-6 text-center text-red-500">
                    Failed to load investments
                  </td>
                </tr>
              ) : investments.length === 0 ? (
                <tr className="block sm:table-row">
                  <td className="block sm:table-cell p-6 text-center text-gray-500">
                    No investments found
                  </td>
                </tr>
              ) : (
                investments.map((inv) => {
                  const customer = inv?.customerId || {};
                  const broker = inv?.brokerId || {};
                  const asset = inv?.assetId || {};

                  return (
                    <tr
                      key={inv._id}
                      className="block sm:table-row border-b sm:border-gray-200 px-2 sm:px-0"
                    >
                      {/* Customer: name first, NIC below */}
                      <td
                        data-label="Customer"
                        className="block sm:table-cell p-3 text-left sm:text-center
                          before:content-[attr(data-label)] before:block sm:before:hidden
                          before:text-[10px] before:text-gray-500 before:mb-1"
                      >
                        <div className="text-sm text-gray-900">
                          {safe(customer?.name)}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {safe(customer?.nic)}
                        </div>
                      </td>

                      {/* Broker: name first, NIC below */}
                      <td
                        data-label="Broker"
                        className="block sm:table-cell p-3 text-left sm:text-center
                          before:content-[attr(data-label)] before:block sm:before:hidden
                          before:text-[10px] before:text-gray-500 before:mb-1"
                      >
                        <div className="text-sm text-gray-900">
                          {safe(broker?.name)}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {safe(broker?.nic)}
                        </div>
                      </td>

                      {/* Asset: name first, type below */}
                      <td
                        data-label="Asset"
                        className="block sm:table-cell p-3 text-left sm:text-center
                          before:content-[attr(data-label)] before:block sm:before:hidden
                          before:text-[10px] before:text-gray-500 before:mb-1"
                      >
                        <div className="text-sm text-gray-900">
                          {safe(asset?.assetName)}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {safe(asset?.assetType)}
                        </div>
                      </td>

                      <td
                        data-label="Estimate"
                        className="block sm:table-cell p-3 text-left sm:text-center
                          before:content-[attr(data-label)] before:block sm:before:hidden
                          before:text-[10px] before:text-gray-500 before:mb-1"
                      >
                        Rs. {formatMoney(asset?.estimateAmount)}
                      </td>

                      <td
                        data-label="Investment"
                        className="block sm:table-cell p-3 text-left sm:text-center
                          before:content-[attr(data-label)] before:block sm:before:hidden
                          before:text-[10px] before:text-gray-500 before:mb-1"
                      >
                        Rs. {formatMoney(inv?.investmentAmount)}
                      </td>

                      <td
                        data-label="Duration"
                        className="block sm:table-cell p-3 text-left sm:text-center
                          before:content-[attr(data-label)] before:block sm:before:hidden
                          before:text-[10px] before:text-gray-500 before:mb-1"
                      >
                        {safe(inv?.investmentDurationMonths)}
                      </td>

                      <td
                        data-label="Interest %"
                        className="block sm:table-cell p-3 text-left sm:text-center
                          before:content-[attr(data-label)] before:block sm:before:hidden
                          before:text-[10px] before:text-gray-500 before:mb-1"
                      >
                        {safe(inv?.investmentInterestRate)}
                      </td>

                      <td
                        data-label="Commission %"
                        className="block sm:table-cell p-3 text-left sm:text-center
                          before:content-[attr(data-label)] before:block sm:before:hidden
                          before:text-[10px] before:text-gray-500 before:mb-1"
                      >
                        {safe(inv?.brokerCommissionRate)}
                      </td>

                      <td
                        data-label="Created"
                        className="block sm:table-cell p-3 text-left sm:text-center
                          before:content-[attr(data-label)] before:block sm:before:hidden
                          before:text-[10px] before:text-gray-500 before:mb-1"
                      >
                        {formatDateTime(inv?.createdAt)}
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
  );
};

export default ViewInvestementpage;
