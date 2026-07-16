import React from "react";
import ReactDOM from "react-dom/client";
import CafePOS from "./App.jsx";
import CustomerOrder from "./CustomerOrder.jsx";

// ຖ້າລິ້ງມີ ?order=1 ແມ່ນໜ້າສັ່ງອາຫານຂອງລູກຄ້າ, ບໍ່ຊັ້ນແມ່ນໜ້າພະນັກງານ
const isCustomerView = new URLSearchParams(window.location.search).has("order");

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>{isCustomerView ? <CustomerOrder /> : <CafePOS />}</React.StrictMode>
);
