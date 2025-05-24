import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import './sensorchart.css';

const SensorChart = ({ data, title, dataKey, color, unit, domain }) => {
  // Formatear fecha/hora para el eje X
  const formatXAxis = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Personalizar tooltip con mejor manejo de errores
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      // Formatear el valor para mostrar solo 2 decimales si es un número
      const formattedValue = typeof value === 'number' ? value.toFixed(2) : value;
      
      return (
        <div className="sensor-chart-tooltip">
          <p className="tooltip-time">{new Date(label).toLocaleString()}</p>
          <p className="tooltip-value">
            {`${title}: ${formattedValue} ${unit}`}
          </p>
        </div>
      );
    }
    return null;
  };

  // Filtrar datos válidos y verificar que el dataKey existe
  const filteredData = data ? data.filter(item => {
    return item && item[dataKey] !== undefined && item[dataKey] !== null;
  }) : [];

  // Si no hay datos válidos, mostrar mensaje
  if (!filteredData || filteredData.length === 0) {
    return (
      <div className="sensor-chart">
        <h4>{title}</h4>
        <div className="chart-container">
          <div style={{ 
            height: 200, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: '#888',
            fontSize: '14px'
          }}>
            No hay datos disponibles para {title}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sensor-chart">
      <h4>{title}</h4>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart
            data={filteredData}
            margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eaeaea" />
            <XAxis 
              dataKey="timestamp" 
              tickFormatter={formatXAxis} 
              stroke="#888"
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              domain={domain || ['auto', 'auto']}
              stroke="#888"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `${typeof value === 'number' ? value.toFixed(1) : value}${unit}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey={dataKey} 
              stroke={color} 
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 1 }}
              activeDot={{ r: 5, strokeWidth: 2 }}
              name={title}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SensorChart;