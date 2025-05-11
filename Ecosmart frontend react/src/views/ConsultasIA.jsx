import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown'; // Import react-markdown
import './ConsultasIA.css';
import HeaderAgricultor from './HeaderAgricultor';

const ConsultasIA = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendMessage = async () => {
  if (input.trim()) {
    const userMessage = { sender: 'user', text: input };
    setMessages([...messages, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/ia/consultas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ consulta: input }),
      });

      if (!response.ok) {
        if (response.status === 400) {
          throw new Error('La consulta enviada no es válida. Por favor, revisa tu mensaje.');
        } else if (response.status === 500) {
          throw new Error('Hubo un problema en el servidor. Inténtalo de nuevo más tarde.');
        } else {
          throw new Error('Error desconocido al comunicarse con la API.');
        }
      }

      const data = await response.json();ta

      if (!data || !data.respuesta) {
        throw new Error('La respuesta de la API es inválida o está incompleta.');
      }

      const aiMessage = { sender: 'ai', text: data.respuesta };
      setMessages((prevMessages) => [...prevMessages, aiMessage]);
    } catch (error) {
      console.error('Error:', error);

      let errorMessage;
      if (error.message.includes('fetch')) {
        errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexión a internet.';
      } else {
        errorMessage = error.message;
      }

      const aiErrorMessage = { sender: 'ai', text: errorMessage };
      setMessages((prevMessages) => [...prevMessages, aiErrorMessage]);
    } finally {
      setLoading(false);
    }
  }
};

  return (
    <div className="consultas-ia-page">
      {/* HeaderAgricultor at the top */}
      <HeaderAgricultor activeItem="consultas" />

      {/* Main Content */}
      <div className="consultas-ia-container">
        <h2 className="consultas-ia-title">Consultas IA</h2>

        {/* Description */}
        <p className="description">
          Bienvenido a Consultas IA. Aquí puedes interactuar con nuestra inteligencia artificial para resolver tus dudas relacionadas con la gestión agrícola. Escribe tu consulta en el cuadro de texto y obtén una respuesta inmediata.
        </p>

        {/* Chat Interface */}
        <div className="chat-container">
          <div className="chat-messages">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`chat-message ${message.sender === 'user' ? 'user' : 'ai'}`}
              >
                {message.sender === 'ai' ? (
                  <ReactMarkdown>{message.text}</ReactMarkdown> // Render AI messages with Markdown
                ) : (
                  message.text
                )}
              </div>
            ))}
            {loading && <div className="chat-message ai">Escribiendo...</div>}
          </div>
          <div className="chat-input-container">
            <input
              type="text"
              placeholder="Escribe tu mensaje..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button onClick={handleSendMessage} disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsultasIA;