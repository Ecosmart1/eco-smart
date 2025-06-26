import React, { createContext, useContext, useState, useCallback } from "react";

const AlertasContext = createContext();

export const useAlertas = () => useContext(AlertasContext);

export const AlertasProvider = ({ children }) => {
  const [alertasActivas, setAlertasActivas] = useState(0);

  // Esta función trae la cantidad de alertas activas para un usuario
  const fetchAlertasActivas = useCallback((usuarioId) => {
    fetch(`http://localhost:5000/api/alertas?user_id=${usuarioId}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAlertasActivas(data.length);
        } else {
          setAlertasActivas(0);
        }
      })
      .catch(() => setAlertasActivas(0));
  }, []);

  // Esta función trae el total de alertas activas del sistema
  const fetchAlertasActivasTotales = useCallback(() => {
    fetch(' ')
      .then(res => res.json())
      .then(data => setAlertasActivas(Array.isArray(data) ? data.length : 0))
      .catch(() => setAlertasActivas(0));
  }, []);

  return (
    <AlertasContext.Provider value={{ alertasActivas, fetchAlertasActivas, fetchAlertasActivasTotales }}>
      {children}
    </AlertasContext.Provider>
  );
};
