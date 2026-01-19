import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  customerSelectMode: "nic", // "nic" | "name"
  selectedCustomerId: null,  // customer._id
  selectedCustomerNic: "",

  assetSelectMode: "name",   // "name" | "type"
  selectedAssetId: null,

  selectedInvestmentId: null,
};

const customerPaySlice = createSlice({
  name: "customerPay",
  initialState,
  reducers: {
    setCustomerSelectMode: (state, action) => {
      state.customerSelectMode = action.payload === "name" ? "name" : "nic";
    },
    setSelectedCustomer: (state, action) => {
      const { customerId, customerNic } = action.payload || {};
      state.selectedCustomerId = customerId || null;
      state.selectedCustomerNic = customerNic || "";
      state.selectedAssetId = null;
      state.selectedInvestmentId = null;
    },
    setAssetSelectMode: (state, action) => {
      state.assetSelectMode = action.payload === "type" ? "type" : "name";
    },
    setSelectedAssetId: (state, action) => {
      state.selectedAssetId = action.payload || null;
      state.selectedInvestmentId = null;
    },
    setSelectedInvestmentId: (state, action) => {
      state.selectedInvestmentId = action.payload || null;
    },
    resetCustomerPay: () => initialState,
  },
});

export const {
  setCustomerSelectMode,
  setSelectedCustomer,
  setAssetSelectMode,
  setSelectedAssetId,
  setSelectedInvestmentId,
  resetCustomerPay,
} = customerPaySlice.actions;

export default customerPaySlice.reducer;
