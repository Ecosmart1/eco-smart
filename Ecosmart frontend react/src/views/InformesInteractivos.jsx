import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import HeaderAgricultor from './headeragricultor';
import HeaderAgronomo from './HeaderAgronomo';
import HeaderTecnico from './headertecnico';
import './InformesInteractivos.css';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

const InformesInteractivos = () => {
  const [usuario, setUsuario] = useState(null);
  const [datosSensores, setDatosSensores] = useState({
    humedad: [],
    temperatura: [],
    ph: [],
    nutrientes: []
  });
  const [alertas, setAlertas] = useState([]);
  const [parcelas, setParcelas] = useState([]);
  const [filtros, setFiltros] = useState({
    parcelaSeleccionada: '',
    rangoTiempo: '24h',
    severidadAlerta: 'todas'
  });
  const [tipoVista, setTipoVista] = useState('dashboard');
  const [cargando, setCargando] = useState(true);
  const [errorConexion, setErrorConexion] = useState(false);
  const [estadisticasResumen, setEstadisticasResumen] = useState({
    temperaturaPromedio: 0,
    humedadPromedio: 0,
    alertasActivas: 0,
    parcelasMonitoreadas: 0,
    alertasCriticas: 0,
    alertasModeradas: 0,
    alertasBajas: 0
  });

  const navigate = useNavigate();
  const API_URL = 'http://localhost:5000/api';

  useEffect(() => {
    const usuarioGuardado = localStorage.getItem('ecosmart_user');
    if (!usuarioGuardado) {
      navigate('/login');
      return;
    }
    const usuarioObj = JSON.parse(usuarioGuardado);
    setUsuario(usuarioObj);
    
    cargarDatos();
  }, [navigate]);

  useEffect(() => {
    if (usuario) {
      cargarDatos();
    }
  }, [filtros, usuario]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('ecosmart_token');
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    if (usuario) {
      headers['X-User-Id'] = usuario.id.toString();
      headers['X-User-Rol'] = usuario.rol;
    }
    
    return headers;
  };

  const cargarDatos = async () => {
    setCargando(true);
    try {
      await Promise.all([
        cargarParcelas(),
        cargarDatosSensores(),
        cargarAlertas()
      ]);
      setErrorConexion(false);
    } catch (error) {
      console.error('Error cargando datos:', error);
      setErrorConexion(true);
      cargarDatosEjemplo();
    } finally {
      setCargando(false);
    }
  };

  const cargarParcelas = async () => {
    try {
      const response = await fetch(`${API_URL}/parcelas`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setParcelas(data);
      }
    } catch (error) {
      console.error('Error cargando parcelas:', error);
      setParcelas([
        { id: 1, nombre: 'Campo Norte', cultivo_actual: 'Tomate' },
        { id: 2, nombre: 'Viñedo Sur', cultivo_actual: 'Uva' }
      ]);
    }
  };

  const cargarDatosSensores = async () => {
    try {
      const parcelaId = filtros.parcelaSeleccionada || 1;

      const response = await fetch(
        `${API_URL}/sensores/datos?parcela=${parcelaId}&periodo=${filtros.rangoTiempo}`,
        { headers: getAuthHeaders() }
      );
      
      if (response.ok) {
        const data = await response.json();
        setDatosSensores(data);
        calcularEstadisticas(data);
      }
    } catch (error) {
      console.error('Error cargando datos de sensores:', error);
      const datosEjemplo = generarDatosSensoresEjemplo();
      setDatosSensores(datosEjemplo);
      calcularEstadisticas(datosEjemplo);
    }
  };

  const cargarAlertas = async () => {
    try {
      let url = `${API_URL}/informes/alertas`;
      const params = new URLSearchParams();
      
      if (filtros.parcelaSeleccionada) {
        params.append('parcela_id', filtros.parcelaSeleccionada);
      }
      
      if (filtros.severidadAlerta !== 'todas') {
        params.append('severidad', filtros.severidadAlerta);
      }
      
      params.append('limite', '200');
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        setAlertas(data.alertas || data);
      }
    } catch (error) {
      console.error('Error cargando alertas:', error);
      setAlertas([
        {
          id: 1,
          parcela: 'Campo Norte',
          tipo: "Humedad de suelo",
          severidad: "critico",
          mensaje: "Humedad crítica detectada - Nivel peligrosamente bajo",
          timestamp: new Date().toISOString(),
          activa: true,
          valor: "15%"
        },
        {
          id: 2,
          parcela: 'Viñedo Sur',
          tipo: "Temperatura",
          severidad: "moderado",
          mensaje: "Temperatura elevada detectada",
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          activa: true,
          valor: "35°C"
        },
        {
          id: 3,
          parcela: 'Campo Norte',
          tipo: "pH del suelo",
          severidad: "baja",
          mensaje: "pH ligeramente ácido",
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          activa: false,
          valor: "5.8"
        }
      ]);
    }
  };

  const calcularEstadisticas = (datos) => {
    const temperaturaPromedio = datos.temperatura?.length > 0 
      ? Math.round(datos.temperatura.reduce((sum, d) => sum + d.valor, 0) / datos.temperatura.length)
      : 0;

    const humedadPromedio = datos.humedad?.length > 0
      ? Math.round(datos.humedad.reduce((sum, d) => sum + d.valor, 0) / datos.humedad.length)
      : 0;

    setEstadisticasResumen(prev => ({
      ...prev,
      temperaturaPromedio,
      humedadPromedio,
      parcelasMonitoreadas: parcelas.length
    }));
  };

  const generarDatosSensoresEjemplo = () => {
    const fechaBase = new Date();
    return {
      humedad: Array.from({ length: 24 }, (_, i) => ({
        timestamp: new Date(fechaBase.getTime() - (23 - i) * 60 * 60 * 1000).toISOString(),
        valor: 45 + Math.random() * 30
      })),
      temperatura: Array.from({ length: 24 }, (_, i) => ({
        timestamp: new Date(fechaBase.getTime() - (23 - i) * 60 * 60 * 1000).toISOString(),
        valor: 18 + Math.random() * 12
      })),
      ph: Array.from({ length: 24 }, (_, i) => ({
        timestamp: new Date(fechaBase.getTime() - (23 - i) * 60 * 60 * 1000).toISOString(),
        valor: 6.0 + Math.random() * 2
      })),
      nutrientes: Array.from({ length: 24 }, (_, i) => ({
        timestamp: new Date(fechaBase.getTime() - (23 - i) * 60 * 60 * 1000).toISOString(),
        valor: {
          nitrogeno: 50 + Math.random() * 30,
          fosforo: 20 + Math.random() * 15,
          potasio: 80 + Math.random() * 40
        }
      }))
    };
  };

  const cargarDatosEjemplo = () => {
    const datosEjemplo = generarDatosSensoresEjemplo();
    setDatosSensores(datosEjemplo);
    setParcelas([
      { id: 1, nombre: 'Campo Norte', cultivo_actual: 'Tomate' },
      { id: 2, nombre: 'Viñedo Sur', cultivo_actual: 'Uva' }
    ]);
    calcularEstadisticas(datosEjemplo);
  };

  const formatXAxis = (timestamp) => {
    const date = new Date(timestamp);
    return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const CustomTooltip = ({ active, payload, label, unidad = "" }) => {
    if (active && payload && payload.length) {
      return (
        <div className="sensor-chart-tooltip">
          <p className="tooltip-time">{new Date(label).toLocaleString()}</p>
          <p className="tooltip-value">
            {`${payload[0].name}: ${payload[0].value} ${unidad}`}
          </p>
        </div>
      );
    }
    return null;
  };

  const procesarDatosNutrientes = () => {
    return datosSensores.nutrientes
      .filter(dato => dato.valor && typeof dato.valor === 'object')
      .map(dato => ({
        timestamp: dato.timestamp,
        nitrogeno: dato.valor.nitrogeno,
        fosforo: dato.valor.fosforo,
        potasio: dato.valor.potasio
      }));
  };

  const marcarAlertaComoRevisada = async (alertaId) => {
    try {
      const response = await fetch(`${API_URL}/informes/alertas/${alertaId}/revisada`, {
        method: 'PUT',
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        setAlertas(prev => prev.map(alerta => 
          alerta.id === alertaId ? { ...alerta, activa: false } : alerta
        ));
      }
    } catch (error) {
      console.error('Error al marcar alerta como revisada:', error);
    }
  };

  const eliminarAlerta = async (alertaId) => {
    try {
      const response = await fetch(`${API_URL}/informes/alertas/${alertaId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        setAlertas(prev => prev.filter(alerta => alerta.id !== alertaId));
      }
    } catch (error) {
      console.error('Error al eliminar alerta:', error);
    }
  };

  // Función PDF Visual Mejorada
  const exportarPDF = async () => {
    try {
      const loadingElement = document.createElement('div');
      loadingElement.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                    background: rgba(0,0,0,0.8); display: flex; justify-content: center; 
                    align-items: center; z-index: 9999; color: white; font-size: 18px;">
          <div style="text-align: center;">
            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 1rem;"></i>
            <div>Generando PDF completo...</div>
            <div style="font-size: 14px; margin-top: 10px;">Esto puede tomar unos segundos</div>
          </div>
        </div>
      `;
      document.body.appendChild(loadingElement);

      const pdf = new jsPDF('p', 'mm', 'a4');
      let isFirstPage = true;
      let currentY = 20;

      // Agregar encabezado del documento
      pdf.setFontSize(20);
      pdf.setTextColor(0, 0, 0);
      pdf.text('INFORME ECOSMART', 20, currentY);
      currentY += 10;
      
      pdf.setFontSize(12);
      pdf.setTextColor(100);
      pdf.text(`Generado: ${new Date().toLocaleString('es-ES')}`, 20, currentY);
      pdf.text(`Usuario: ${usuario?.nombre || 'N/A'}`, 20, currentY + 7);
      currentY += 20;

      // Secciones a capturar en orden
      const secciones = [
        { 
          selector: '.filtros-panel', 
          titulo: 'FILTROS APLICADOS',
          descripcion: 'Configuración actual de filtros y parámetros'
        },
        { 
          selector: '.resumen-metricas', 
          titulo: 'RESUMEN DE MÉTRICAS',
          descripcion: 'Estadísticas principales del sistema'
        },
        { 
          selector: '.graficos-sensores', 
          titulo: 'DATOS DE SENSORES',
          descripcion: 'Gráficos y mediciones de sensores'
        },
        { 
          selector: '.alertas-estadisticas', 
          titulo: 'ESTADÍSTICAS DE ALERTAS',
          descripcion: 'Resumen de alertas por tipo'
        },
        { 
          selector: '.alertas-contenedor', 
          titulo: 'HISTORIAL DE ALERTAS',
          descripcion: 'Lista detallada de alertas'
        }
      ];

      for (const seccion of secciones) {
        const elemento = document.querySelector(seccion.selector);
        
        if (elemento && elemento.offsetWidth > 0 && elemento.offsetHeight > 0) {
          try {
            // Scroll suave hacia el elemento
            elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Asegurar que el elemento esté completamente visible
            const rect = elemento.getBoundingClientRect();
            if (rect.top < 0 || rect.bottom > window.innerHeight) {
              window.scrollTo({
                top: window.scrollY + rect.top - 100,
                behavior: 'smooth'
              });
              await new Promise(resolve => setTimeout(resolve, 500));
            }

            // Capturar el elemento
            const canvas = await html2canvas(elemento, {
              useCORS: true,
              allowTaint: true,
              scale: 1,
              backgroundColor: '#ffffff',
              width: elemento.scrollWidth,
              height: elemento.scrollHeight,
              windowWidth: window.innerWidth,
              windowHeight: window.innerHeight,
              scrollX: 0,
              scrollY: 0,
              logging: false
            });

            if (canvas && canvas.width > 0 && canvas.height > 0) {
              const imgData = canvas.toDataURL('image/png', 0.8);
              const pdfWidth = pdf.internal.pageSize.getWidth();
              const pdfHeight = pdf.internal.pageSize.getHeight();
              const imgWidth = pdfWidth - 40; // Márgenes de 20mm cada lado
              const imgHeight = (canvas.height * imgWidth) / canvas.width;

              // Verificar si necesitamos nueva página
              if (currentY + imgHeight > pdfHeight - 20) {
                pdf.addPage();
                currentY = 20;
              }

              // Agregar título de sección
              pdf.setFontSize(14);
              pdf.setTextColor(0, 0, 0);
              pdf.text(seccion.titulo, 20, currentY);
              currentY += 7;
              
              pdf.setFontSize(10);
              pdf.setTextColor(100);
              pdf.text(seccion.descripcion, 20, currentY);
              currentY += 10;

              // Agregar imagen
              pdf.addImage(imgData, 'PNG', 20, currentY, imgWidth, imgHeight);
              currentY += imgHeight + 10;

              // Si la imagen es muy alta, agregar nueva página
              if (imgHeight > pdfHeight - 60) {
                pdf.addPage();
                currentY = 20;
              }
            }
          } catch (error) {
            console.warn(`Error capturando sección ${seccion.titulo}:`, error);
            
            // Agregar mensaje de error en el PDF
            pdf.setFontSize(12);
            pdf.setTextColor(255, 0, 0);
            pdf.text(`Error al capturar: ${seccion.titulo}`, 20, currentY);
            currentY += 15;
          }
        }
      }

      // Agregar datos textuales como respaldo
      pdf.addPage();
      currentY = 20;
      
      pdf.setFontSize(16);
      pdf.setTextColor(0, 0, 0);
      pdf.text('DATOS ADICIONALES', 20, currentY);
      currentY += 15;
      
      // Estadísticas
      pdf.setFontSize(12);
      pdf.text('ESTADÍSTICAS:', 20, currentY);
      currentY += 10;
      
      pdf.setFontSize(10);
      pdf.text(`• Temperatura Promedio: ${estadisticasResumen.temperaturaPromedio}°C`, 25, currentY);
      currentY += 6;
      pdf.text(`• Humedad Promedio: ${estadisticasResumen.humedadPromedio}%`, 25, currentY);
      currentY += 6;
      pdf.text(`• Parcelas Monitoreadas: ${estadisticasResumen.parcelasMonitoreadas}`, 25, currentY);
      currentY += 6;
      pdf.text(`• Total de Alertas: ${alertas.length}`, 25, currentY);
      currentY += 15;
      
      // Listado de alertas
      if (alertas.length > 0) {
        pdf.setFontSize(12);
        pdf.text('ALERTAS ACTIVAS:', 20, currentY);
        currentY += 10;
        
        alertas.slice(0, 10).forEach((alerta, index) => {
          if (currentY > pdf.internal.pageSize.getHeight() - 30) {
            pdf.addPage();
            currentY = 20;
          }
          
          pdf.setFontSize(9);
          const texto = `${index + 1}. ${alerta.tipo} - ${alerta.parcela} (${alerta.severidad})`;
          pdf.text(texto, 25, currentY);
          currentY += 5;
          
          const mensaje = `   ${alerta.mensaje}`;
          pdf.text(mensaje, 25, currentY);
          currentY += 8;
        });
      }

      // Scroll de vuelta al inicio
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Descargar PDF
      const fecha = new Date().toISOString().split('T')[0];
      const hora = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
      pdf.save(`informe-ecosmart-completo-${fecha}-${hora}.pdf`);
      
      document.body.removeChild(loadingElement);
      alert('PDF generado exitosamente con todo el contenido');
      
    } catch (error) {
      console.error('Error al exportar PDF:', error);
      alert('Error al generar el PDF. Revisa la consola para más detalles.');
      
      const loadingElement = document.querySelector('[style*="position: fixed"]');
      if (loadingElement && loadingElement.parentNode) {
        document.body.removeChild(loadingElement);
      }
    }
  };

  // Función PDF Textual Simple
  // Reemplazar la función exportarPDFSimple con esta versión mejorada:

const exportarPDFCompleto = async () => {
  try {
    const pdf = new jsPDF('p', 'mm', 'a4');
    let currentY = 20;
    const pageHeight = pdf.internal.pageSize.getHeight();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    // Función auxiliar para agregar nueva página si es necesario
    const checkPageBreak = (requiredSpace = 20) => {
      if (currentY + requiredSpace > pageHeight - 20) {
        pdf.addPage();
        currentY = 20;
        return true;
      }
      return false;
    };

    // Función auxiliar para agregar líneas de separación
    const addSeparatorLine = () => {
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 5;
    };

    // ENCABEZADO PRINCIPAL
    pdf.setFontSize(24);
    pdf.setTextColor(0, 100, 0); // Verde
    pdf.text('INFORME ECOSMART COMPLETO', margin, currentY);
    currentY += 15;
    
    pdf.setFontSize(12);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Generado: ${new Date().toLocaleString('es-ES')}`, margin, currentY);
    currentY += 7;
    pdf.text(`Usuario: ${usuario?.nombre || 'Usuario no identificado'}`, margin, currentY);
    currentY += 7;
    pdf.text(`Rol: ${usuario?.rol || 'N/A'}`, margin, currentY);
    currentY += 15;

    addSeparatorLine();

    // INFORMACIÓN GENERAL DEL SISTEMA
    checkPageBreak(30);
    pdf.setFontSize(16);
    pdf.setTextColor(0, 0, 0);
    pdf.text('1. INFORMACIÓN GENERAL DEL SISTEMA', margin, currentY);
    currentY += 12;
    
    pdf.setFontSize(10);
    pdf.setTextColor(60, 60, 60);
    
    // Filtros aplicados
    pdf.text('Filtros Aplicados:', margin, currentY);
    currentY += 6;
    pdf.text(`• Parcela seleccionada: ${filtros.parcelaSeleccionada ? 
      parcelas.find(p => p.id == filtros.parcelaSeleccionada)?.nombre || 'N/A' : 'Todas las parcelas'}`, margin + 5, currentY);
    currentY += 5;
    pdf.text(`• Período de tiempo: ${filtros.rangoTiempo}`, margin + 5, currentY);
    currentY += 5;
    pdf.text(`• Severidad de alertas: ${filtros.severidadAlerta}`, margin + 5, currentY);
    currentY += 5;
    pdf.text(`• Vista actual: ${tipoVista === 'dashboard' ? 'Resumen' : tipoVista === 'sensores' ? 'Sensores' : 'Alertas'}`, margin + 5, currentY);
    currentY += 15;

    // Estado de conexión
    pdf.text('Estado del Sistema:', margin, currentY);
    currentY += 6;
    pdf.text(`• Conexión API: ${errorConexion ? 'Error - Usando datos de ejemplo' : 'Conectado correctamente'}`, margin + 5, currentY);
    currentY += 5;
    pdf.text(`• Datos cargados: ${new Date().toLocaleString('es-ES')}`, margin + 5, currentY);
    currentY += 15;

    addSeparatorLine();

    // ESTADÍSTICAS GENERALES
    checkPageBreak(40);
    pdf.setFontSize(16);
    pdf.setTextColor(0, 0, 0);
    pdf.text('2. ESTADÍSTICAS GENERALES', margin, currentY);
    currentY += 12;
    
    pdf.setFontSize(10);
    pdf.setTextColor(60, 60, 60);
    
    const estadisticas = [
      { label: 'Temperatura Promedio', valor: `${estadisticasResumen.temperaturaPromedio}°C`, icono: '🌡️' },
      { label: 'Humedad Promedio', valor: `${estadisticasResumen.humedadPromedio}%`, icono: '💧' },
      { label: 'Parcelas Monitoreadas', valor: `${estadisticasResumen.parcelasMonitoreadas}`, icono: '🌱' },
      { label: 'Total de Alertas', valor: `${alertas.length}`, icono: '⚠️' },
      { label: 'Alertas Críticas', valor: `${alertas.filter(a => a.severidad === 'critico').length}`, icono: '🔴' },
      { label: 'Alertas Moderadas', valor: `${alertas.filter(a => a.severidad === 'moderado').length}`, icono: '🟡' },
      { label: 'Alertas Bajas', valor: `${alertas.filter(a => a.severidad === 'baja').length}`, icono: '🟢' },
      { label: 'Alertas Activas', valor: `${alertas.filter(a => a.activa !== false).length}`, icono: '🔄' }
    ];

    estadisticas.forEach(stat => {
      pdf.text(`• ${stat.label}: ${stat.valor}`, margin, currentY);
      currentY += 6;
    });
    currentY += 10;

    addSeparatorLine();

    // INFORMACIÓN DETALLADA DE PARCELAS
    checkPageBreak(30);
    pdf.setFontSize(16);
    pdf.setTextColor(0, 0, 0);
    pdf.text('3. INFORMACIÓN DE PARCELAS', margin, currentY);
    currentY += 12;
    
    pdf.setFontSize(10);
    pdf.setTextColor(60, 60, 60);
    
    if (parcelas.length > 0) {
      parcelas.forEach((parcela, index) => {
        checkPageBreak(25);
        
        pdf.setFontSize(12);
        pdf.setTextColor(0, 0, 0);
        pdf.text(`Parcela ${index + 1}: ${parcela.nombre}`, margin, currentY);
        currentY += 8;
        
        pdf.setFontSize(10);
        pdf.setTextColor(60, 60, 60);
        pdf.text(`• ID: ${parcela.id}`, margin + 5, currentY);
        currentY += 5;
        pdf.text(`• Cultivo actual: ${parcela.cultivo_actual || 'Sin especificar'}`, margin + 5, currentY);
        currentY += 5;
        pdf.text(`• Ubicación: ${parcela.ubicacion || 'No especificada'}`, margin + 5, currentY);
        currentY += 5;
        pdf.text(`• Área: ${parcela.hectareas ? `${parcela.hectareas} hectáreas` : 'No especificada'}`, margin + 5, currentY);
        currentY += 5;
        if (parcela.fecha_siembra) {
          pdf.text(`• Fecha de siembra: ${new Date(parcela.fecha_siembra).toLocaleDateString('es-ES')}`, margin + 5, currentY);
          currentY += 5;
        }
        if (parcela.variedad) {
          pdf.text(`• Variedad: ${parcela.variedad}`, margin + 5, currentY);
          currentY += 5;
        }
        currentY += 8;
      });
    } else {
      pdf.text('No hay parcelas registradas en el sistema.', margin, currentY);
      currentY += 15;
    }

    addSeparatorLine();

    // DATOS DETALLADOS DE SENSORES
    checkPageBreak(30);
    pdf.setFontSize(16);
    pdf.setTextColor(0, 0, 0);
    pdf.text('4. DATOS DETALLADOS DE SENSORES', margin, currentY);
    currentY += 12;

    // Temperatura
    if (datosSensores.temperatura?.length > 0) {
      checkPageBreak(25);
      pdf.setFontSize(12);
      pdf.setTextColor(220, 50, 47); // Rojo para temperatura
      pdf.text('TEMPERATURA AMBIENTE', margin, currentY);
      currentY += 8;
      
      pdf.setFontSize(10);
      pdf.setTextColor(60, 60, 60);
      
      const tempStats = {
        min: Math.min(...datosSensores.temperatura.map(d => d.valor)),
        max: Math.max(...datosSensores.temperatura.map(d => d.valor)),
        promedio: datosSensores.temperatura.reduce((sum, d) => sum + d.valor, 0) / datosSensores.temperatura.length
      };
      
      pdf.text(`• Temperatura mínima: ${tempStats.min.toFixed(1)}°C`, margin + 5, currentY);
      currentY += 5;
      pdf.text(`• Temperatura máxima: ${tempStats.max.toFixed(1)}°C`, margin + 5, currentY);
      currentY += 5;
      pdf.text(`• Temperatura promedio: ${tempStats.promedio.toFixed(1)}°C`, margin + 5, currentY);
      currentY += 5;
      pdf.text(`• Total de mediciones: ${datosSensores.temperatura.length}`, margin + 5, currentY);
      currentY += 8;
      
      pdf.text('Últimas 10 mediciones:', margin + 5, currentY);
      currentY += 6;
      
      datosSensores.temperatura.slice(-10).forEach((dato, index) => {
        checkPageBreak(6);
        pdf.text(`  ${index + 1}. ${new Date(dato.timestamp).toLocaleString('es-ES')}: ${dato.valor.toFixed(1)}°C`, margin + 10, currentY);
        currentY += 5;
      });
      currentY += 8;
    }

    // Humedad
    if (datosSensores.humedad?.length > 0) {
      checkPageBreak(25);
      pdf.setFontSize(12);
      pdf.setTextColor(52, 152, 219); // Azul para humedad
      pdf.text('HUMEDAD DEL SUELO', margin, currentY);
      currentY += 8;
      
      pdf.setFontSize(10);
      pdf.setTextColor(60, 60, 60);
      
      const humStats = {
        min: Math.min(...datosSensores.humedad.map(d => d.valor)),
        max: Math.max(...datosSensores.humedad.map(d => d.valor)),
        promedio: datosSensores.humedad.reduce((sum, d) => sum + d.valor, 0) / datosSensores.humedad.length
      };
      
      pdf.text(`• Humedad mínima: ${humStats.min.toFixed(1)}%`, margin + 5, currentY);
      currentY += 5;
      pdf.text(`• Humedad máxima: ${humStats.max.toFixed(1)}%`, margin + 5, currentY);
      currentY += 5;
      pdf.text(`• Humedad promedio: ${humStats.promedio.toFixed(1)}%`, margin + 5, currentY);
      currentY += 5;
      pdf.text(`• Total de mediciones: ${datosSensores.humedad.length}`, margin + 5, currentY);
      currentY += 8;
      
      pdf.text('Últimas 10 mediciones:', margin + 5, currentY);
      currentY += 6;
      
      datosSensores.humedad.slice(-10).forEach((dato, index) => {
        checkPageBreak(6);
        pdf.text(`  ${index + 1}. ${new Date(dato.timestamp).toLocaleString('es-ES')}: ${dato.valor.toFixed(1)}%`, margin + 10, currentY);
        currentY += 5;
      });
      currentY += 8;
    }

    // pH del suelo
    if (datosSensores.ph?.length > 0) {
      checkPageBreak(25);
      pdf.setFontSize(12);
      pdf.setTextColor(142, 68, 173); // Púrpura para pH
      pdf.text('pH DEL SUELO', margin, currentY);
      currentY += 8;
      
      pdf.setFontSize(10);
      pdf.setTextColor(60, 60, 60);
      
      const phStats = {
        min: Math.min(...datosSensores.ph.map(d => d.valor)),
        max: Math.max(...datosSensores.ph.map(d => d.valor)),
        promedio: datosSensores.ph.reduce((sum, d) => sum + d.valor, 0) / datosSensores.ph.length
      };
      
      pdf.text(`• pH mínimo: ${phStats.min.toFixed(2)}`, margin + 5, currentY);
      currentY += 5;
      pdf.text(`• pH máximo: ${phStats.max.toFixed(2)}`, margin + 5, currentY);
      currentY += 5;
      pdf.text(`• pH promedio: ${phStats.promedio.toFixed(2)}`, margin + 5, currentY);
      currentY += 5;
      pdf.text(`• Total de mediciones: ${datosSensores.ph.length}`, margin + 5, currentY);
      currentY += 5;
      
      // Interpretación del pH
      let interpretacion = '';
      if (phStats.promedio < 6.0) interpretacion = 'Suelo ácido';
      else if (phStats.promedio > 7.5) interpretacion = 'Suelo alcalino';
      else interpretacion = 'Suelo neutro (óptimo)';
      
      pdf.text(`• Interpretación: ${interpretacion}`, margin + 5, currentY);
      currentY += 8;
      
      pdf.text('Últimas 10 mediciones:', margin + 5, currentY);
      currentY += 6;
      
      datosSensores.ph.slice(-10).forEach((dato, index) => {
        checkPageBreak(6);
        pdf.text(`  ${index + 1}. ${new Date(dato.timestamp).toLocaleString('es-ES')}: ${dato.valor.toFixed(2)}`, margin + 10, currentY);
        currentY += 5;
      });
      currentY += 8;
    }

    // Nutrientes
    if (datosSensores.nutrientes?.length > 0) {
      checkPageBreak(30);
      pdf.setFontSize(12);
      pdf.setTextColor(46, 125, 50); // Verde para nutrientes
      pdf.text('NIVELES DE NUTRIENTES', margin, currentY);
      currentY += 8;
      
      pdf.setFontSize(10);
      pdf.setTextColor(60, 60, 60);
      
      const nutrientesValidos = datosSensores.nutrientes.filter(d => d.valor && typeof d.valor === 'object');
      
      if (nutrientesValidos.length > 0) {
        const nitrogeno = nutrientesValidos.map(d => d.valor.nitrogeno).filter(v => v !== undefined);
        const fosforo = nutrientesValidos.map(d => d.valor.fosforo).filter(v => v !== undefined);
        const potasio = nutrientesValidos.map(d => d.valor.potasio).filter(v => v !== undefined);
        
        if (nitrogeno.length > 0) {
          const nStats = {
            min: Math.min(...nitrogeno),
            max: Math.max(...nitrogeno),
            promedio: nitrogeno.reduce((sum, v) => sum + v, 0) / nitrogeno.length
          };
          pdf.text(`• Nitrógeno - Min: ${nStats.min.toFixed(1)} | Max: ${nStats.max.toFixed(1)} | Prom: ${nStats.promedio.toFixed(1)}`, margin + 5, currentY);
          currentY += 5;
        }
        
        if (fosforo.length > 0) {
          const pStats = {
            min: Math.min(...fosforo),
            max: Math.max(...fosforo),
            promedio: fosforo.reduce((sum, v) => sum + v, 0) / fosforo.length
          };
          pdf.text(`• Fósforo - Min: ${pStats.min.toFixed(1)} | Max: ${pStats.max.toFixed(1)} | Prom: ${pStats.promedio.toFixed(1)}`, margin + 5, currentY);
          currentY += 5;
        }
        
        if (potasio.length > 0) {
          const kStats = {
            min: Math.min(...potasio),
            max: Math.max(...potasio),
            promedio: potasio.reduce((sum, v) => sum + v, 0) / potasio.length
          };
          pdf.text(`• Potasio - Min: ${kStats.min.toFixed(1)} | Max: ${kStats.max.toFixed(1)} | Prom: ${kStats.promedio.toFixed(1)}`, margin + 5, currentY);
          currentY += 5;
        }
        
        pdf.text(`• Total de mediciones: ${nutrientesValidos.length}`, margin + 5, currentY);
        currentY += 8;
        
        pdf.text('Últimas 5 mediciones completas:', margin + 5, currentY);
        currentY += 6;
        
        nutrientesValidos.slice(-5).forEach((dato, index) => {
          checkPageBreak(8);
          pdf.text(`  ${index + 1}. ${new Date(dato.timestamp).toLocaleString('es-ES')}:`, margin + 10, currentY);
          currentY += 5;
          if (dato.valor.nitrogeno !== undefined) {
            pdf.text(`     N: ${dato.valor.nitrogeno.toFixed(1)} | P: ${dato.valor.fosforo?.toFixed(1) || 'N/A'} | K: ${dato.valor.potasio?.toFixed(1) || 'N/A'}`, margin + 10, currentY);
            currentY += 5;
          }
        });
        currentY += 8;
      }
    }

    addSeparatorLine();

    // HISTORIAL COMPLETO DE ALERTAS
    checkPageBreak(30);
    pdf.setFontSize(16);
    pdf.setTextColor(0, 0, 0);
    pdf.text('5. HISTORIAL COMPLETO DE ALERTAS', margin, currentY);
    currentY += 12;

    if (alertas.length > 0) {
      // Resumen de alertas por severidad
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Resumen por Severidad:', margin, currentY);
      currentY += 8;
      
      pdf.setFontSize(10);
      pdf.setTextColor(60, 60, 60);
      
      const alertasPorSeveridad = {
        critico: alertas.filter(a => a.severidad === 'critico'),
        moderado: alertas.filter(a => a.severidad === 'moderado'),
        baja: alertas.filter(a => a.severidad === 'baja')
      };
      
      pdf.text(`• Críticas: ${alertasPorSeveridad.critico.length} alertas`, margin + 5, currentY);
      currentY += 5;
      pdf.text(`• Moderadas: ${alertasPorSeveridad.moderado.length} alertas`, margin + 5, currentY);
      currentY += 5;
      pdf.text(`• Bajas: ${alertasPorSeveridad.baja.length} alertas`, margin + 5, currentY);
      currentY += 5;
      pdf.text(`• Activas: ${alertas.filter(a => a.activa !== false).length} alertas`, margin + 5, currentY);
      currentY += 5;
      pdf.text(`• Revisadas: ${alertas.filter(a => a.activa === false).length} alertas`, margin + 5, currentY);
      currentY += 15;

      // Alertas por tipo
      const alertasPorTipo = {};
      alertas.forEach(alerta => {
        alertasPorTipo[alerta.tipo] = (alertasPorTipo[alerta.tipo] || 0) + 1;
      });
      
      pdf.text('Resumen por Tipo:', margin, currentY);
      currentY += 8;
      
      Object.entries(alertasPorTipo).forEach(([tipo, cantidad]) => {
        pdf.text(`• ${tipo}: ${cantidad} alertas`, margin + 5, currentY);
        currentY += 5;
      });
      currentY += 10;

      // Listado detallado de todas las alertas
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Detalle Completo de Alertas:', margin, currentY);
      currentY += 10;
      
      alertas.forEach((alerta, index) => {
        checkPageBreak(20);
        
        // Color según severidad
        let color = [60, 60, 60]; // Gris por defecto
        if (alerta.severidad === 'critico') color = [220, 50, 47]; // Rojo
        else if (alerta.severidad === 'moderado') color = [255, 152, 0]; // Naranja
        else if (alerta.severidad === 'baja') color = [76, 175, 80]; // Verde
        
        pdf.setFontSize(10);
        pdf.setTextColor(...color);
        pdf.text(`ALERTA #${index + 1} - ${alerta.severidad.toUpperCase()}`, margin, currentY);
        currentY += 6;
        
        pdf.setFontSize(9);
        pdf.setTextColor(60, 60, 60);
        pdf.text(`• ID: ${alerta.id}`, margin + 5, currentY);
        currentY += 4;
        pdf.text(`• Parcela: ${alerta.parcela}`, margin + 5, currentY);
        currentY += 4;
        pdf.text(`• Tipo: ${alerta.tipo}`, margin + 5, currentY);
        currentY += 4;
        pdf.text(`• Mensaje: ${alerta.mensaje}`, margin + 5, currentY);
        currentY += 4;
        pdf.text(`• Valor detectado: ${alerta.valor || 'N/A'}`, margin + 5, currentY);
        currentY += 4;
        pdf.text(`• Fecha: ${new Date(alerta.timestamp).toLocaleString('es-ES')}`, margin + 5, currentY);
        currentY += 4;
        pdf.text(`• Estado: ${alerta.activa !== false ? 'ACTIVA' : 'REVISADA'}`, margin + 5, currentY);
        currentY += 8;
      });
    } else {
      pdf.setFontSize(10);
      pdf.setTextColor(60, 60, 60);
      pdf.text('No hay alertas registradas en el sistema.', margin, currentY);
      currentY += 15;
    }

    addSeparatorLine();

    // PIE DE PÁGINA CON RESUMEN FINAL
    checkPageBreak(25);
    pdf.setFontSize(14);
    pdf.setTextColor(0, 100, 0);
    pdf.text('6. RESUMEN EJECUTIVO', margin, currentY);
    currentY += 10;
    
    pdf.setFontSize(10);
    pdf.setTextColor(60, 60, 60);
    
    const resumenFinal = [
      `Sistema EcoSmart monitoreando ${parcelas.length} parcela(s)`,
      `Total de ${datosSensores.temperatura?.length || 0} mediciones de temperatura registradas`,
      `Total de ${datosSensores.humedad?.length || 0} mediciones de humedad registradas`,
      `Total de ${datosSensores.ph?.length || 0} mediciones de pH registradas`,
      `${alertas.length} alertas en el historial del sistema`,
      `${alertas.filter(a => a.activa !== false).length} alertas activas requieren atención`,
      `Estado general del sistema: ${errorConexion ? 'Desconectado (datos de ejemplo)' : 'Conectado y funcionando'}`
    ];
    
    resumenFinal.forEach(item => {
      pdf.text(`• ${item}`, margin, currentY);
      currentY += 6;
    });

    // Información final
    pdf.addPage();
    currentY = 20;
    
    pdf.setFontSize(12);
    pdf.setTextColor(100, 100, 100);
    pdf.text('Informe generado automáticamente por EcoSmart', margin, currentY);
    currentY += 8;
    pdf.text(`Fecha y hora de generación: ${new Date().toLocaleString('es-ES')}`, margin, currentY);
    currentY += 8;
    pdf.text('Para más información, contacte al administrador del sistema.', margin, currentY);

    // Descargar PDF
    const fecha = new Date().toISOString().split('T')[0];
    const hora = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    pdf.save(`informe-ecosmart-completo-${fecha}-${hora}.pdf`);
    
    alert('PDF completo generado exitosamente con todos los datos disponibles');
    
  } catch (error) {
    console.error('Error al exportar PDF completo:', error);
    alert('Error al generar el PDF completo. Revisa la consola para más detalles.');
  }
};


  const exportarExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      
      // Hoja de estadísticas
      const estadisticas = [
        ['INFORME ECOSMART - ESTADÍSTICAS'],
        ['Fecha:', new Date().toLocaleString('es-ES')],
        ['Usuario:', usuario?.nombre || 'N/A'],
        [''],
        ['Estadística', 'Valor'],
        ['Temperatura Promedio', `${estadisticasResumen.temperaturaPromedio}°C`],
        ['Humedad Promedio', `${estadisticasResumen.humedadPromedio}%`],
        ['Parcelas Monitoreadas', estadisticasResumen.parcelasMonitoreadas],
        ['Alertas Críticas', alertas.filter(a => a.severidad === 'critico').length],
        ['Alertas Moderadas', alertas.filter(a => a.severidad === 'moderado').length],
        ['Total Alertas', alertas.length]
      ];
      const wsEstadisticas = XLSX.utils.aoa_to_sheet(estadisticas);
      XLSX.utils.book_append_sheet(wb, wsEstadisticas, 'Estadísticas');
      
      // Hoja de alertas
      if (alertas.length > 0) {
        const alertasData = [
          ['ALERTAS DETALLADAS'],
          [''],
          ['ID', 'Parcela', 'Tipo', 'Severidad', 'Mensaje', 'Valor', 'Fecha', 'Estado']
        ];
        
        alertas.forEach(alerta => {
          alertasData.push([
            alerta.id,
            alerta.parcela,
            alerta.tipo,
            alerta.severidad.toUpperCase(),
            alerta.mensaje,
            alerta.valor || 'N/A',
            new Date(alerta.timestamp).toLocaleString('es-ES'),
            alerta.activa !== false ? 'ACTIVA' : 'REVISADA'
          ]);
        });
        
        const wsAlertas = XLSX.utils.aoa_to_sheet(alertasData);
        XLSX.utils.book_append_sheet(wb, wsAlertas, 'Alertas');
      }
      
      // Hoja de datos de sensores
      if (datosSensores.temperatura?.length > 0) {
        const sensoresData = [
          ['DATOS DE SENSORES'],
          [''],
          ['Fecha', 'Temperatura (°C)', 'Humedad (%)', 'pH']
        ];
        
        const maxLength = Math.max(
          datosSensores.temperatura?.length || 0,
          datosSensores.humedad?.length || 0,
          datosSensores.ph?.length || 0
        );
        
        for (let i = 0; i < maxLength; i++) {
          sensoresData.push([
            datosSensores.temperatura?.[i]?.timestamp ? 
              new Date(datosSensores.temperatura[i].timestamp).toLocaleString('es-ES') : '',
            datosSensores.temperatura?.[i]?.valor?.toFixed(2) || '',
            datosSensores.humedad?.[i]?.valor?.toFixed(2) || '',
            datosSensores.ph?.[i]?.valor?.toFixed(2) || ''
          ]);
        }
        
        const wsSensores = XLSX.utils.aoa_to_sheet(sensoresData);
        XLSX.utils.book_append_sheet(wb, wsSensores, 'Sensores');
      }
      
      const fecha = new Date().toISOString().split('T')[0];
      const hora = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
      XLSX.writeFile(wb, `informe-ecosmart-${fecha}-${hora}.xlsx`);
      alert('Excel generado exitosamente');
      
    } catch (error) {
      console.error('Error al exportar Excel:', error);
      alert('Error al generar Excel. Inténtalo de nuevo.');
    }
  };

  const exportarCSV = () => {
    try {
      let csvContent = "data:text/csv;charset=utf-8,";
      
      csvContent += "INFORME ECOSMART\n";
      csvContent += `Fecha:,${new Date().toLocaleString('es-ES')}\n`;
      csvContent += `Usuario:,${usuario?.nombre || 'N/A'}\n\n`;
      
      csvContent += "ESTADÍSTICAS\n";
      csvContent += "Estadística,Valor\n";
      csvContent += `Temperatura Promedio,${estadisticasResumen.temperaturaPromedio}°C\n`;
      csvContent += `Humedad Promedio,${estadisticasResumen.humedadPromedio}%\n`;
      csvContent += `Parcelas Monitoreadas,${estadisticasResumen.parcelasMonitoreadas}\n`;
      csvContent += `Alertas Críticas,${alertas.filter(a => a.severidad === 'critico').length}\n`;
      csvContent += `Alertas Moderadas,${alertas.filter(a => a.severidad === 'moderado').length}\n`;
      csvContent += `Total Alertas,${alertas.length}\n\n`;
      
      if (alertas.length > 0) {
        csvContent += "ALERTAS\n";
        csvContent += "ID,Parcela,Tipo,Severidad,Mensaje,Valor,Fecha,Estado\n";
        
        alertas.forEach(alerta => {
          csvContent += `${alerta.id},"${alerta.parcela}","${alerta.tipo}","${alerta.severidad}","${alerta.mensaje}","${alerta.valor || 'N/A'}","${new Date(alerta.timestamp).toLocaleString('es-ES')}","${alerta.activa !== false ? 'ACTIVA' : 'REVISADA'}"\n`;
        });
      }
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      const fecha = new Date().toISOString().split('T')[0];
      const hora = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
      link.setAttribute("download", `informe-ecosmart-${fecha}-${hora}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      alert('CSV generado exitosamente');
      
    } catch (error) {
      console.error('Error al exportar CSV:', error);
      alert('Error al generar CSV. Inténtalo de nuevo.');
    }
  };

  const renderExportacion = () => (
  <div className="exportacion-panel">
    <h3>Opciones de Exportación</h3>
    <div className="export-buttons">
      <button className="btn-export pdf" onClick={exportarPDFCompleto}>
        <i className="fas fa-file-pdf"></i> Exportar PDF Completo
      </button>
      <button className="btn-export excel" onClick={exportarExcel}>
        <i className="fas fa-file-excel"></i> Excel Detallado
      </button>
      <button className="btn-export csv" onClick={exportarCSV}>
        <i className="fas fa-file-csv"></i> CSV Completo
      </button>
    </div>
  </div>
);

  const renderHeader = () => {
    if (!usuario) return null;
    
    switch (usuario.rol) {
      case 'agricultor':
        return <HeaderAgricultor activeItem="informes" />;
      case 'agronomo':
        return <HeaderAgronomo activeItem="informes" />;
      case 'tecnico':
        return <HeaderTecnico activeItem="informes" />;
      default:
        return <HeaderAgricultor activeItem="informes" />;
    }
  };

  if (cargando) {
    return (
      <div className="informes-loading">
        <div className="loading-spinner">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Cargando datos de informes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="informes-interactivos">
      {renderHeader()}
      
      {errorConexion && (
        <div className="alerta-conexion">
          <div className="alerta-conexion-content">
            <i className="fas fa-exclamation-triangle"></i>
            <span>Problemas de conectividad. Mostrando datos de ejemplo.</span>
            <button onClick={cargarDatos}>
              <i className="fas fa-sync-alt"></i> Reintentar
            </button>
          </div>
        </div>
      )}

      <div className="informes-container">
        <div className="informes-header">
          <h1>Informes Interactivos</h1>
          <p>Monitor y análisis completo de tu sistema agrícola</p>
        </div>

        {/* Panel de filtros */}
        <div className="filtros-panel">
          <div className="filtro-grupo">
            <label>Parcela:</label>
            <select 
              value={filtros.parcelaSeleccionada}
              onChange={(e) => setFiltros({...filtros, parcelaSeleccionada: e.target.value})}
            >
              <option value="">Todas las parcelas</option>
              {parcelas.map(parcela => (
                <option key={parcela.id} value={parcela.id}>
                  {parcela.nombre} - {parcela.cultivo_actual || 'Sin cultivo'}
                </option>
              ))}
            </select>
          </div>
          
          <div className="filtro-grupo">
            <label>Período:</label>
            <select 
              value={filtros.rangoTiempo}
              onChange={(e) => setFiltros({...filtros, rangoTiempo: e.target.value})}
            >
              <option value="24h">Últimas 24 horas</option>
              <option value="7d">Últimos 7 días</option>
              <option value="30d">Últimos 30 días</option>
            </select>
          </div>

          <div className="filtro-grupo">
            <label>Severidad de alertas:</label>
            <select 
              value={filtros.severidadAlerta}
              onChange={(e) => setFiltros({...filtros, severidadAlerta: e.target.value})}
            >
              <option value="todas">Todas</option>
              <option value="critico">Críticas</option>
              <option value="moderado">Moderadas</option>
            </select>
          </div>
        </div>

        {/* Navegación de vistas */}
        <div className="vista-tabs">
          <button 
            className={tipoVista === 'dashboard' ? 'tab-active' : ''}
            onClick={() => setTipoVista('dashboard')}
          >
            <i className="fas fa-tachometer-alt"></i> Resumen
          </button>
          <button 
            className={tipoVista === 'sensores' ? 'tab-active' : ''}
            onClick={() => setTipoVista('sensores')}
          >
            <i className="fas fa-chart-line"></i> Sensores
          </button>
          <button 
            className={tipoVista === 'alertas' ? 'tab-active' : ''}
            onClick={() => setTipoVista('alertas')}
          >
            <i className="fas fa-exclamation-triangle"></i> Alertas
          </button>
        </div>

        {/* Contenido principal */}
        <div className="informes-content">
          {/* VISTA RESUMEN */}
          {tipoVista === 'dashboard' && (
            <div className="dashboard-view">
              <div className="resumen-metricas">
                <div className="metricas-grid">
                  <div className="metrica-card temperatura">
                    <div className="metrica-icon">
                      <i className="fas fa-thermometer-half"></i>
                    </div>
                    <div className="metrica-info">
                      <h3>Temperatura Promedio</h3>
                      <p className="metrica-valor">
                        {estadisticasResumen.temperaturaPromedio}°C
                      </p>
                      <small>Últimas mediciones</small>
                    </div>
                  </div>

                  <div className="metrica-card humedad">
                    <div className="metrica-icon">
                      <i className="fas fa-tint"></i>
                    </div>
                    <div className="metrica-info">
                      <h3>Humedad Promedio</h3>
                      <p className="metrica-valor">
                        {estadisticasResumen.humedadPromedio}%
                      </p>
                      <small>Nivel del suelo</small>
                    </div>
                  </div>

                  <div className="metrica-card parcelas">
                    <div className="metrica-icon">
                      <i className="fas fa-seedling"></i>
                    </div>
                    <div className="metrica-info">
                      <h3>Parcelas Monitoreadas</h3>
                      <p className="metrica-valor">{parcelas.length}</p>
                      <small>Total activas</small>
                    </div>
                  </div>

                  <div className="metrica-card alertas-criticas">
                    <div className="metrica-icon">
                      <i className="fas fa-exclamation-triangle"></i>
                    </div>
                    <div className="metrica-info">
                      <h3>Alertas Críticas</h3>
                      <p className="metrica-valor">
                        {alertas.filter(a => a.severidad === 'critico').length}
                      </p>
                      <small>Requieren atención</small>
                    </div>
                  </div>

                  <div className="metrica-card alertas-moderadas">
                    <div className="metrica-icon">
                      <i className="fas fa-exclamation-circle"></i>
                    </div>
                    <div className="metrica-info">
                      <h3>Alertas Moderadas</h3>
                      <p className="metrica-valor">
                        {alertas.filter(a => a.severidad === 'moderado').length}
                      </p>
                      <small>En seguimiento</small>
                    </div>
                  </div>

                  <div className="metrica-card alertas-totales">
                    <div className="metrica-icon">
                      <i className="fas fa-list-alt"></i>
                    </div>
                    <div className="metrica-info">
                      <h3>Total Alertas</h3>
                      <p className="metrica-valor">{alertas.length}</p>
                      <small>Historial completo</small>
                    </div>
                  </div>
                </div>

                {/* Información de la parcela seleccionada */}
                {filtros.parcelaSeleccionada && (
                  <div className="parcela-seleccionada-info">
                    <h3>Información de la Parcela</h3>
                    {(() => {
                      const parcela = parcelas.find(p => p.id == filtros.parcelaSeleccionada);
                      return parcela ? (
                        <div className="parcela-detalles">
                          <div className="detalle-item">
                            <strong>Nombre:</strong> {parcela.nombre}
                          </div>
                          <div className="detalle-item">
                            <strong>Cultivo Actual:</strong> {parcela.cultivo_actual || 'Sin cultivo'}
                          </div>
                          <div className="detalle-item">
                            <strong>Ubicación:</strong> {parcela.ubicacion || 'No especificada'}
                          </div>
                          <div className="detalle-item">
                            <strong>Área:</strong> {parcela.hectareas ? `${parcela.hectareas} ha` : 'No especificada'}
                          </div>
                          {parcela.fecha_siembra && (
                            <div className="detalle-item">
                              <strong>Fecha de Siembra:</strong> {new Date(parcela.fecha_siembra).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VISTA SENSORES */}
          {tipoVista === 'sensores' && (
            <div className="sensores-view">
              <div className="sensores-header">
                <h2>Datos de Sensores</h2>
                <p>Monitoreo en tiempo real de todos los parámetros</p>
              </div>
              
              <div className="graficos-sensores">
                <div className="grafico-item">
                  <h3>Temperatura Ambiente</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={datosSensores.temperatura}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timestamp" tickFormatter={formatXAxis} />
                      <YAxis />
                      <Tooltip content={<CustomTooltip unidad="°C" />} />
                      <Legend />
                      <Line type="monotone" dataKey="valor" stroke="#e74c3c" name="Temperatura" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="grafico-item">
                  <h3>Humedad del Suelo</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={datosSensores.humedad}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timestamp" tickFormatter={formatXAxis} />
                      <YAxis />
                      <Tooltip content={<CustomTooltip unidad="%" />} />
                      <Legend />
                      <Area type="monotone" dataKey="valor" stroke="#3498db" fill="#3498db" fillOpacity={0.3} name="Humedad" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="grafico-item">
                  <h3>pH del Suelo</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={datosSensores.ph}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timestamp" tickFormatter={formatXAxis} />
                      <YAxis domain={[0, 14]} />
                      <Tooltip content={<CustomTooltip unidad="" />} />
                      <Legend />
                      <Line type="monotone" dataKey="valor" stroke="#8884d8" name="pH" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="grafico-item">
                  <h3>Niveles de Nutrientes</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={procesarDatosNutrientes()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timestamp" tickFormatter={formatXAxis} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="nitrogeno" fill="#4caf50" name="Nitrógeno" />
                      <Bar dataKey="fosforo" fill="#ff9800" name="Fósforo" />
                      <Bar dataKey="potasio" fill="#9c27b0" name="Potasio" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* VISTA ALERTAS */}
          {tipoVista === 'alertas' && (
            <div className="alertas-view">
              <div className="alertas-header">
                <h2>Historial de Alertas</h2>
                <p>Seguimiento completo de todas las alertas del sistema</p>
              </div>

              <div className="alertas-estadisticas">
                <div className="estadistica-item critica">
                  <div className="stat-icon">
                    <i className="fas fa-exclamation-triangle"></i>
                  </div>
                  <div className="stat-info">
                    <h4>Críticas</h4>
                    <p className="stat-number">{alertas.filter(a => a.severidad === 'critico').length}</p>
                  </div>
                </div>
                
                <div className="estadistica-item moderada">
                  <div className="stat-icon">
                    <i className="fas fa-exclamation-circle"></i>
                  </div>
                  <div className="stat-info">
                    <h4>Moderadas</h4>
                    <p className="stat-number">{alertas.filter(a => a.severidad === 'moderado').length}</p>
                  </div>
                </div>
                
                <div className="estadistica-item totales">
                  <div className="stat-icon">
                    <i className="fas fa-list-alt"></i>
                  </div>
                  <div className="stat-info">
                    <h4>Total</h4>
                    <p className="stat-number">{alertas.length}</p>
                  </div>
                </div>
              </div>

              <div className="alertas-lista">
                <div className="alertas-lista-header">
                  <h3>Alertas Recientes</h3>
                  <span className="total-alertas">Total: {alertas.length}</span>
                </div>
                
                {alertas.length === 0 ? (
                  <div className="no-alertas">
                    <i className="fas fa-check-circle"></i>
                    <p>No hay alertas para mostrar</p>
                  </div>
                ) : (
                  <div className="alertas-contenedor">
                    {alertas.map(alerta => (
                      <div key={alerta.id} className={`alerta-item ${alerta.severidad}`}>
                        <div className="alerta-icon">
                          <i className={`fas ${
                            alerta.severidad === 'critico' ? 'fa-exclamation-triangle' :
                            alerta.severidad === 'moderado' ? 'fa-exclamation-circle' :
                            'fa-info-circle'
                          }`}></i>
                        </div>
                        
                        <div className="alerta-info">
                          <div className="alerta-header-info">
                            <h4>{alerta.tipo}</h4>
                            <span className="alerta-parcela">{alerta.parcela}</span>
                          </div>
                          <p className="alerta-mensaje">{alerta.mensaje}</p>
                          <div className="alerta-metadata">
                            <small className="alerta-fecha">
                              {new Date(alerta.timestamp).toLocaleString()}
                            </small>
                            {alerta.valor && (
                              <small className="alerta-valor">
                                {alerta.valor}
                              </small>
                            )}
                          </div>
                        </div>
                        
                        <div className="alerta-acciones">
                          <div className={`alerta-severidad-badge ${alerta.severidad}`}>
                            {alerta.severidad === 'critico' ? 'Crítica' :
                             alerta.severidad === 'moderado' ? 'Moderada' :
                             'Baja'}
                          </div>
                          
                          <div className="alerta-botones">
                            {alerta.activa !== false && (
                              <button 
                                className="btn-revisar"
                                onClick={() => marcarAlertaComoRevisada(alerta.id)}
                                title="Marcar como revisada"
                              >
                                <i className="fas fa-check"></i>
                              </button>
                            )}
                            
                            <button 
                              className="btn-eliminar"
                              onClick={() => {
                                if (window.confirm('¿Estás seguro de que quieres eliminar esta alerta?')) {
                                  eliminarAlerta(alerta.id);
                                }
                              }}
                              title="Eliminar alerta"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Panel de exportación */}
        {renderExportacion()}
      </div>
    </div>
  );
};

export default InformesInteractivos;