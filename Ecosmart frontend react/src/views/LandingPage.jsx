// frontend/src/views/LandingPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => {
  return (
    <div className="landing-page">
      {/* Header/Navbar */}
      <header className="header">
        <div className="logo-container">
          <img src="/logo-ecosmart.png" alt="EcoSmart Logo" className="logo" />
          <span className="logo-text">EcoSmart</span>
        </div>
        <nav className="navigation">
          <ul>
            <li><a href="#inicio">Inicio</a></li>
            <li><a href="#caracteristicas">Características</a></li>
            <li><a href="#recursos">Recursos</a></li>
            <li><a href="#contacto">Contacto</a></li>
          </ul>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="hero" id="inicio">
        <div className="hero-content">
          <h1>EcoSmart</h1>
          <p className="hero-subtitle">Plataforma de Agricultura Inteligente</p>
          <div className="hero-buttons">
            <Link to="/login" className="btn btn-primary">Iniciar Sesión</Link>
            <Link to="/registro" className="btn btn-secondary">Registrarse</Link>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="about-section" id="caracteristicas">
        <div className="container">
          <h2>¿Qué es EcoSmart?</h2>
          <div className="about-content">
            <p>
              El proyecto EcoSmart es una plataforma de agricultura que permite a sus usuarios monitorear cultivos, 
              visualizar datos, recibir recomendaciones inteligentes y tomar decisiones basadas en 
              datos para optimizar el rendimiento mientras reducen el uso de recursos.
            </p>
          </div>

          <div className="features">
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-cloud-sun"></i>
              </div>
              <h3>Servicios Meteorológicos</h3>
              <p>
                Pronóstico del clima meteorológico actualizado y pronóstico, personalizado para su ubicación agrícola, permitiendo anticipar condiciones adversas para los cultivos.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-brain"></i>
              </div>
              <h3>Inteligencia Artificial</h3>
              <p>
                Diagnóstico enfermedades y plagas analizando imágenes descritas por usuarios, ofreciendo medidas sanitarias y recomendando tratamientos específicos.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-chart-line"></i>
              </div>
              <h3>Análisis de Datos</h3>
              <p>
                Analice tendencias de cultivo, compare rendimientos históricos y reciba alertas cuando los sensores detecten condiciones fuera de los parámetros óptimos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="benefits-section" id="recursos">
        <div className="container">
          <h2>Beneficios de EcoSmart</h2>
          <div className="benefits-grid">
            <div className="benefit-item">
              <div className="benefit-icon">
                <i className="fas fa-tint"></i>
              </div>
              <h3>Optimización de Riego</h3>
              <p>Reduce el consumo de agua hasta un 30% con recomendaciones precisas basadas en datos de humedad del suelo.</p>
            </div>
            
            <div className="benefit-item">
              <div className="benefit-icon">
                <i className="fas fa-seedling"></i>
              </div>
              <h3>Mayor Rendimiento</h3>
              <p>Aumenta la productividad de tus cultivos mediante el monitoreo constante y la detección temprana de problemas.</p>
            </div>
            
            <div className="benefit-item">
              <div className="benefit-icon">
                <i className="fas fa-globe-americas"></i>
              </div>
              <h3>Agricultura Sostenible</h3>
              <p>Reduce el impacto ambiental optimizando el uso de fertilizantes y recursos naturales.</p>
            </div>
            
            <div className="benefit-item">
              <div className="benefit-icon">
                <i className="fas fa-bell"></i>
              </div>
              <h3>Alertas en Tiempo Real</h3>
              <p>Recibe notificaciones inmediatas cuando tus cultivos necesiten atención urgente.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="contact-section" id="contacto">
        <div className="container">
          <h2>Contáctanos</h2>
          <div className="contact-content">
            <div className="contact-info">
              <h3>Información de Contacto</h3>
              <p><i className="fas fa-map-marker-alt"></i> Universidad de Talca Campus Curicó</p>
              <p><i className="fas fa-road"></i> Camino a Los Niches Km 1</p>
              <p><i className="fas fa-envelope"></i> ecosmart@ecosmart.cl</p>
            </div>
            
            <div className="contact-form">
              <form>
                <div className="form-group">
                  <label htmlFor="name">Nombre</label>
                  <input type="text" id="name" name="name" placeholder="Su nombre" required />
                </div>
                
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input type="email" id="email" name="email" placeholder="Su correo electrónico" required />
                </div>
                
                <div className="form-group">
                  <label htmlFor="message">Mensaje</label>
                  <textarea id="message" name="message" placeholder="Escriba su mensaje" required></textarea>
                </div>
                
                <button type="submit" className="btn btn-primary">Enviar Mensaje</button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-logo">
              <img src="/logo-ecosmart.png" alt="EcoSmart Logo" className="footer-logo-img" />
              <h3>EcoSmart</h3>
            </div>
            
            <div className="footer-social">
            <a href="https://twitter.com/" className="social-icon" target="_blank" rel="noopener noreferrer">
            <i className="fab fa-twitter"></i>
            </a>
            <a href="https://instagram.com/" className="social-icon" target="_blank" rel="noopener noreferrer">
            <i className="fab fa-instagram"></i>
            </a>
            <a href="https://youtube.com/" className="social-icon" target="_blank" rel="noopener noreferrer">
    <i className="fab fa-youtube"></i>
  </a>
  <a href="https://linkedin.com/" className="social-icon" target="_blank" rel="noopener noreferrer">
    <i className="fab fa-linkedin"></i>
  </a>
</div>
          </div>
          
          <div className="footer-bottom">
            <p>&copy; 2025 EcoSmart - Universidad de Talca. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
export default LandingPage;

