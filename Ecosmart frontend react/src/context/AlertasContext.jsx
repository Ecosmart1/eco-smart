import React, { createContext, useContext, useState, useEffect } from 'react';

const AlertasContext = createContext();

export const useAlertas = () => useContext(AlertasContext);

export const AlertasProvider = ({ children }) => {
  const [alertasActivas, setAlertasActivas] = useState(0);
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    const usuarioGuardado = localStorage.getItem('ecosmart_user');
    if (!usuarioGuardado) return;
    const usuarioObj = JSON.parse(usuarioGuardado);
    setUsuario(usuarioObj);
  }, []);

  const fetchAlertasActivas = () => {
    if (!usuario) return;
    fetch(`http://localhost:5000/api/alertas?usuario_id=${usuario.id}`)
      .then(res => res.json())
      .then(data => setAlertasActivas(Array.isArray(data) ? data.length : 0))
      .catch(() => setAlertasActivas(0));
  };

  useEffect(() => {
    fetchAlertasActivas();
    // Opcional: polling cada 30s
    const interval = setInterval(fetchAlertasActivas, 30000);
    return () => clearInterval(interval);
  }, [usuario]);

  return (
    <AlertasContext.Provider value={{ alertasActivas, fetchAlertasActivas }}>
      {children}
    </AlertasContext.Provider>
  );
};