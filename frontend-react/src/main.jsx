// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./localisation.js";
import "./style.css";

ReactDOM.createRoot(document.getElementById("racine-react")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
