import React from 'react';
import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import "./index.css";
import App from "./App.jsx";
// Eliminar o comentar esta línea ya que estás usando CDN para Bootstrap:
// import "bootstrap/dist/css/bootstrap.min.css";

// AÑADIR ESTA LÍNEA PARA FONT AWESOME:

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);