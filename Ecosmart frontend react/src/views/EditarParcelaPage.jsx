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
  
  // Cargar los datos de la parcela al montar el componente
  useEffect(() => {
    const cargarParcela = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_URL}/parcelas/${id}`);
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
    navigate('/dashboard/agricultor/parcelas');
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
          redirectUrl="/dashboard/agricultor/parcelas"
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