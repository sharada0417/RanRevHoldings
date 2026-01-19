import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  brokerSelectMode: "nic", // "nic" | "name"
  selectedBrokerNic: "",
  selectedBrokerId: null,

  selectedAssetId: null, // from broker summary investments.asset._id

  selectedInvestmentId: null, // optional: pay specific investment
};

const brokerPaySlice = createSlice({
  name: "brokerPay",
  initialState,
  reducers: {
    setBrokerSelectMode: (state, action) => {
      state.brokerSelectMode = action.payload === "name" ? "name" : "nic";
    },
    setSelectedBroker: (state, action) => {
      const { brokerNic, brokerId } = action.payload || {};
      state.selectedBrokerNic = brokerNic || "";
      state.selectedBrokerId = brokerId || null;

      state.selectedAssetId = null;
      state.selectedInvestmentId = null;
    },
    setSelectedAssetId: (state, action) => {
      state.selectedAssetId = action.payload || null;
      state.selectedInvestmentId = null;
    },
    setSelectedInvestmentId: (state, action) => {
      state.selectedInvestmentId = action.payload || null;
    },
    resetBrokerPay: () => initialState,
  },
});

export const {
  setBrokerSelectMode,
  setSelectedBroker,
  setSelectedAssetId,
  setSelectedInvestmentId,
  resetBrokerPay,
} = brokerPaySlice.actions;

export default brokerPaySlice.reducer;
