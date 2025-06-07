import React from 'react';
import HeaderAgronomo from './HeaderAgronomo';
import AlertasUsuario from './AlertasAgricultor'; // Importa el componente de alertas del agricultor

const AlertasAgronomo = () => (
  <>
    <HeaderAgronomo activeItem="alertas" />
    <AlertasUsuario />
  </>
);

export default AlertasAgronomo;