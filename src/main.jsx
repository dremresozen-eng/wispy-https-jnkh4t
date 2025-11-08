import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
 // Eğer App başka yerdeyse yolu ona göre düzelt
// import "./index.css"; // CSS dosyan varsa bunu aç

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
