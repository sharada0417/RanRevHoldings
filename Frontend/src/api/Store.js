import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";

import userReducer from "./features/userSlice";
import customerReducer from "./features/customerSlice";
import brokerReducer from "./features/brokerSlice";
import assetReducer from "./features/assetSlice";
import investmentReducer from "./features/investmentSlice";

import customerPayReducer from "./features/customerpaySlice";
import brokerPayReducer from "./features/brokerpaySlice";

import { customerPayHistoryApi } from "../api/customerPayHistoryApi";
import { brokerPayHistoryApi } from "../api/brokerPayHistoryApi";

import { userApi } from "../api/userApi";
import { customerApi } from "../api/customerApi";
import { brokerApi } from "../api/brokerApi";
import { assetApi } from "../api/assetApi";
import { investmentApi } from "../api/investmentApi";

import { customerPayApi } from "../api/customerpayApi";
import { brokerPayApi } from "../api/brokerpayApi";
import { dashboardApi } from "../api/dashboardApi";

const store = configureStore({
  reducer: {
    user: userReducer,
    customer: customerReducer,
    broker: brokerReducer,
    asset: assetReducer,
    investment: investmentReducer,
    
    customerPay: customerPayReducer,
    brokerPay: brokerPayReducer,
    [dashboardApi.reducerPath]: dashboardApi.reducer,
    [userApi.reducerPath]: userApi.reducer,
    [customerApi.reducerPath]: customerApi.reducer,
    [brokerApi.reducerPath]: brokerApi.reducer,
    [assetApi.reducerPath]: assetApi.reducer,
    [investmentApi.reducerPath]: investmentApi.reducer,

    [customerPayApi.reducerPath]: customerPayApi.reducer,
    [brokerPayApi.reducerPath]: brokerPayApi.reducer,

    [customerPayHistoryApi.reducerPath]: customerPayHistoryApi.reducer,
    [brokerPayHistoryApi.reducerPath]: brokerPayHistoryApi.reducer,
  },

  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      userApi.middleware,
      customerApi.middleware,
      brokerApi.middleware,
      assetApi.middleware,
      investmentApi.middleware,
      dashboardApi.middleware,
      customerPayApi.middleware,
      brokerPayApi.middleware,

      customerPayHistoryApi.middleware,
      brokerPayHistoryApi.middleware
    ),
});

setupListeners(store.dispatch);

export default store;
