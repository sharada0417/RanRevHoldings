import React, { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Provider } from "react-redux";
import "./index.css";

import store from "./api/Store.js";

// pages/layouts...
import SignUpPage from "./pages/SignUp.page.jsx";
import SignInPage from "./pages/SignIn.page.jsx";
import EmailVerificationPage from "./pages/EmailVerfication.jsx";

import RootLayout from "./layout/RootLayout.jsx";
import SecondLayout from "./layout/SecondLayout.jsx";
import CustomerLayout from "./layout/CustomerLayout.jsx";
import PaymnetLayout from "./layout/PaymnetLayout.jsx";
import BrokerLayout from "./layout/BrokerLayout.jsx";
import InvestmentLayout from "./layout/InvestmentLayout.jsx";
import AssetLayout from "./layout/AssetLayout.jsx";

import HomePage from "./pages/Home.page.jsx";
import UserPage from "./pages/User.jsx";
import NotificationPage from "./pages/Notification.page.jsx";

import CustomerPage from "./pages/Cutomer.page.jsx";
import ViewCustomerPage from "./pages/view.customer.page.jsx";

import CustomerPaymantPage from "./pages/CustomerPayment.page.jsx";
import CustomerPaymantHistory from "./pages/customerPaymentHistory.jsx";
import BrokerPaymantPage from "./pages/BrokerPayment.page.jsx";
import BrokerPaymantHistory from "./pages/BrokerpaymentHistory.jsx";

import BrokerPage from "./pages/Broker.page.jsx";
import ViewBrokersPage from "./pages/view.brokers.jsx";

import InvestementPage from "./pages/Investment.page.jsx";
import ViewInvestementpage from "./pages/View.investement.page.jsx";

import AssetPage from "./pages/Asset.page.jsx";
import ViewAssetpage from "./pages/view.assets.page.jsx";

// ✅ NEW
import ProtectedRoute from "./compoments/ProtectedRoute.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <Routes>
          <Route element={<RootLayout />}>
            {/* PUBLIC ROUTES */}
            <Route path="/" element={<SignUpPage />} />
            <Route path="/signin" element={<SignInPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/vertify" element={<EmailVerificationPage />} />

            {/* Notification (protect if you want) */}
            <Route
              path="/notification"
              element={
                <ProtectedRoute>
                  <NotificationPage />
                </ProtectedRoute>
              }
            />

            {/* ✅ PROTECTED: SecondLayout */}
            <Route
              element={
                <ProtectedRoute>
                  <SecondLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/home" element={<HomePage />} />
              <Route path="/user" element={<UserPage />} />
            </Route>

            {/* ✅ PROTECTED: CUSTOMER */}
            <Route
              path="/customers"
              element={
                <ProtectedRoute>
                  <CustomerLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<CustomerPage />} />
              <Route path="viewcustomers" element={<ViewCustomerPage />} />
            </Route>

            {/* ✅ PROTECTED: PAYMENT */}
            <Route
              path="/payment"
              element={
                <ProtectedRoute>
                  <PaymnetLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<CustomerPaymantPage />} />
              <Route path="customer" element={<CustomerPaymantPage />} />
              <Route path="customer/history" element={<CustomerPaymantHistory />} />
              <Route path="broker" element={<BrokerPaymantPage />} />
              <Route path="broker/history" element={<BrokerPaymantHistory />} />
            </Route>

            {/* ✅ PROTECTED: BROKER */}
            <Route
              path="/broker"
              element={
                <ProtectedRoute>
                  <BrokerLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<BrokerPage />} />
              <Route path="viewbrokers" element={<ViewBrokersPage />} />
            </Route>

            {/* ✅ PROTECTED: INVESTMENT */}
            <Route
              path="/investment"
              element={
                <ProtectedRoute>
                  <InvestmentLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<InvestementPage />} />
              <Route path="viewinvestment" element={<ViewInvestementpage />} />
            </Route>

            {/* ✅ PROTECTED: ASSETS */}
            <Route
              path="/assets"
              element={
                <ProtectedRoute>
                  <AssetLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AssetPage />} />
              <Route path="viewassets" element={<ViewAssetpage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </Provider>
  </StrictMode>
);
