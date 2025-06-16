// EditarParcelaPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Spinner, Alert } from 'react-bootstrap';
import FormularioParcela from './FormularioParcela';
import './EditarParcelaPage.css';

const EditarParcelaPage = ({ API_URL }) => {
  const { id } = useParams(); // Obtiene el ID de la URL
  const navigate = useNavigate();
  const [parcela, setParcela] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState('');
  
  // Obtener el rol del usuario al montar el componente
  useEffect(() => {
    const usuarioGuardado = localStorage.getItem('ecosmart_user');
    if (usuarioGuardado) {
      try {
        const usuario = JSON.parse(usuarioGuardado);
        setUserRole(usuario.rol || '');
      } catch (err) {
        console.error('Error al parsear datos de usuario:', err);
      }
    }
  }, []);

  // Función para determinar la ruta base según el rol del usuario
  const getBaseRoute = () => {
    if (userRole === 'agronomo') {
      return '/dashboard/agronomo';
    } else if (userRole === 'agricultor') {
      return '/dashboard/agricultor';
    } else if (userRole === 'tecnico') {
      return '/dashboard/agronomo'; // Los técnicos usan la misma ruta que los agrónomos
    } else {
      // Si no hay rol definido, usar la ruta actual
      const currentPath = window.location.pathname;
      if (currentPath.includes('/dashboard/agronomo')) {
        return '/dashboard/agronomo';
      } else if (currentPath.includes('/dashboard/agricultor')) {
        return '/dashboard/agricultor';
      } else {
        // Valor predeterminado si no se puede determinar
        return '/dashboard';
      }
    }
  };
  
  // Cargar los datos de la parcela al montar el componente
  useEffect(() => {
    const cargarParcela = async () => {
      try {
        setLoading(true);
        const user = JSON.parse(localStorage.getItem('ecosmart_user') || '{}');
        const response = await axios.get(`${API_URL}/parcelas/${id}`, {
          headers: { 'X-User-Id': user.id }
        });
        setParcela(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error al cargar la parcela:', err);
        setError('No se pudo cargar la información de la parcela. Por favor, intente nuevamente.');
        setLoading(false);
      }
    };

    cargarParcela();
  }, [id, API_URL]);

  // Manejar el cierre del formulario
  const handleClose = () => {
    navigate(`${getBaseRoute()}/parcelas`);
  };

  // Si está cargando, mostrar spinner
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: "60vh" }}>
        <Spinner animation="border" role="status" className="text-success">
          <span className="visually-hidden">Cargando...</span>
        </Spinner>
      </div>
    );
  }

  // Si hubo un error, mostrar mensaje de error
  if (error) {
    return (
      <div className="error-container">
        <Alert variant="danger">
          <h4>Error al cargar la parcela</h4>
          <p>{error}</p>
          <button onClick={handleClose} className="btn btn-success mt-3">
            Volver a la lista de parcelas
          </button>
        </Alert>
      </div>
    );
  }

  // Si la parcela existe, mostrar el formulario
  return (
    <div className="editar-parcela-page">
      {parcela ? (
        <FormularioParcela
          parcelaEditar={parcela}
          onClose={handleClose}
          API_URL={API_URL}
          redirectUrl={`${getBaseRoute()}/parcelas`}
        />
      ) : (
        <div className="error-container">
          <Alert variant="warning">
            <h4>Parcela no encontrada</h4>
            <p>No se pudo encontrar la parcela solicitada.</p>
            <button onClick={handleClose} className="btn btn-success mt-3">
              Volver a la lista de parcelas
            </button>
          </Alert>
        </div>
      )}
    </div>
  );
};

export default EditarParcelaPage;