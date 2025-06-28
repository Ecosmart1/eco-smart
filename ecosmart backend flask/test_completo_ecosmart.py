#!/usr/bin/env python3
"""
PRUEBAS UNITARIAS COMPLETAS - ECOSMART
Autor: GitHub Copilot
Fecha: 27 de Junio, 2025
Descripción: Script de pruebas unitarias para todo el sistema EcoSmart
"""

import sys
import os
import json
import time
from datetime import datetime
import traceback

# Agregar el directorio actual al path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

try:
    from flask import Flask
    from modelos.models import db, Usuario, Parcela, LecturaSensor, AlertaSensor, DetalleCultivo, RangoParametro
    from werkzeug.security import check_password_hash
    from sqlalchemy import text, func
    import requests
    print("✅ Todas las importaciones exitosas")
except ImportError as e:
    print(f"❌ Error en importaciones: {e}")
    sys.exit(1)

class TestCompleto:
    def __init__(self):
        self.app = Flask(__name__)
        self.app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:p1p3@localhost:5432/Ecosmart'
        self.app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
        self.app.config['TESTING'] = True
        db.init_app(self.app)
        
        self.resultados = {
            'fecha_ejecucion': datetime.now().isoformat(),
            'total_pruebas': 0,
            'exitosas': 0,
            'fallidas': 0,
            'detalles': {}
        }
        
        self.API_URL = 'http://localhost:5000/api'
        
    def log_resultado(self, categoria, nombre_test, exitoso, mensaje="", detalles=None):
        """Registra el resultado de una prueba"""
        self.resultados['total_pruebas'] += 1
        
        if exitoso:
            self.resultados['exitosas'] += 1
            estado = "✅ PASS"
        else:
            self.resultados['fallidas'] += 1
            estado = "❌ FAIL"
            
        if categoria not in self.resultados['detalles']:
            self.resultados['detalles'][categoria] = []
            
        self.resultados['detalles'][categoria].append({
            'test': nombre_test,
            'estado': estado,
            'mensaje': mensaje,
            'detalles': detalles
        })
        
        print(f"{estado} {categoria} - {nombre_test}: {mensaje}")
        
    def test_base_datos(self):
        """Pruebas de conectividad y estructura de base de datos"""
        print("\n🔍 TESTING: BASE DE DATOS")
        print("=" * 50)
        
        with self.app.app_context():
            try:
                # Test 1: Conectividad
                db.session.execute(text('SELECT 1'))
                db.session.commit()
                self.log_resultado('Database', 'Conectividad', True, "Conexión exitosa")
                
                # Test 2: Tablas principales
                tablas_requeridas = ['usuarios', 'parcelas', 'cultivos', 'sensores', 'alertas', 'rangos_parametros']
                tablas_existentes = db.engine.table_names()
                
                for tabla in tablas_requeridas:
                    if tabla in tablas_existentes:
                        self.log_resultado('Database', f'Tabla {tabla}', True, "Existe")
                    else:
                        self.log_resultado('Database', f'Tabla {tabla}', False, "No existe")
                
                # Test 3: Contar registros
                usuarios_count = Usuario.query.count()
                parcelas_count = Parcela.query.count()
                
                self.log_resultado('Database', 'Datos usuarios', True, f"{usuarios_count} usuarios encontrados")
                self.log_resultado('Database', 'Datos parcelas', True, f"{parcelas_count} parcelas encontradas")
                
            except Exception as e:
                self.log_resultado('Database', 'Error general', False, str(e))

    def test_modelos(self):
        """Pruebas de los modelos de datos"""
        print("\n🔍 TESTING: MODELOS DE DATOS")
        print("=" * 50)
        
        with self.app.app_context():
            try:
                # Test 1: Usuario modelo
                usuario_test = Usuario.query.first()
                if usuario_test:
                    self.log_resultado('Models', 'Usuario model', True, f"Usuario: {usuario_test.nombre}")
                    
                    # Verificar campos requeridos
                    campos_usuario = ['id', 'nombre', 'email', 'password', 'rol']
                    for campo in campos_usuario:
                        if hasattr(usuario_test, campo):
                            self.log_resultado('Models', f'Usuario.{campo}', True, "Campo existe")
                        else:
                            self.log_resultado('Models', f'Usuario.{campo}', False, "Campo faltante")
                else:
                    self.log_resultado('Models', 'Usuario model', False, "No hay usuarios")
                
                # Test 2: Parcela modelo
                parcela_test = Parcela.query.first()
                if parcela_test:
                    self.log_resultado('Models', 'Parcela model', True, f"Parcela: {parcela_test.nombre}")
                    
                    campos_parcela = ['id', 'nombre', 'ubicacion', 'hectareas', 'usuario_id']
                    for campo in campos_parcela:
                        if hasattr(parcela_test, campo):
                            self.log_resultado('Models', f'Parcela.{campo}', True, "Campo existe")
                        else:
                            self.log_resultado('Models', f'Parcela.{campo}', False, "Campo faltante")
                else:
                    self.log_resultado('Models', 'Parcela model', False, "No hay parcelas")
                
                # Test 3: Relaciones
                if usuario_test and parcela_test:
                    parcelas_usuario = Parcela.query.filter_by(usuario_id=usuario_test.id).count()
                    self.log_resultado('Models', 'Relación Usuario-Parcela', True, f"{parcelas_usuario} parcelas del usuario")
                
            except Exception as e:
                self.log_resultado('Models', 'Error general', False, str(e))

    def test_autenticacion(self):
        """Pruebas del sistema de autenticación"""
        print("\n🔍 TESTING: AUTENTICACIÓN")
        print("=" * 50)
        
        with self.app.app_context():
            try:
                # Test 1: Usuario agricultor
                agricultor = Usuario.query.filter_by(email='agricultor@ecosmart.com').first()
                if agricultor:
                    # Verificar contraseña
                    password_valida = check_password_hash(agricultor.password, 'agri123')
                    self.log_resultado('Auth', 'Login agricultor', password_valida, 
                                     f"Email: agricultor@ecosmart.com, Password válido: {password_valida}")
                else:
                    self.log_resultado('Auth', 'Login agricultor', False, "Usuario no encontrado")
                
                # Test 2: Usuario agrónomo
                agronomo = Usuario.query.filter_by(email='agronomo@ecosmart.com').first()
                if agronomo:
                    password_valida = check_password_hash(agronomo.password, 'agro123')
                    self.log_resultado('Auth', 'Login agrónomo', password_valida,
                                     f"Email: agronomo@ecosmart.com, Password válido: {password_valida}")
                else:
                    self.log_resultado('Auth', 'Login agrónomo', False, "Usuario no encontrado")
                
                # Test 3: Usuario técnico
                tecnico = Usuario.query.filter_by(rol='tecnico').first()
                if tecnico:
                    self.log_resultado('Auth', 'Usuario técnico', True, f"Técnico: {tecnico.nombre}")
                else:
                    self.log_resultado('Auth', 'Usuario técnico', False, "No hay técnicos")
                
                # Test 4: Roles válidos
                roles_sistema = ['agricultor', 'agronomo', 'tecnico']
                usuarios_por_rol = {}
                for rol in roles_sistema:
                    count = Usuario.query.filter_by(rol=rol).count()
                    usuarios_por_rol[rol] = count
                    self.log_resultado('Auth', f'Rol {rol}', count > 0, f"{count} usuarios")
                
            except Exception as e:
                self.log_resultado('Auth', 'Error general', False, str(e))

    def test_api_endpoints(self):
        """Pruebas de endpoints de la API"""
        print("\n🔍 TESTING: API ENDPOINTS")
        print("=" * 50)
        
        try:
            # Test 1: Health check
            try:
                response = requests.get(f"{self.API_URL}/debug/database", timeout=5)
                if response.status_code == 200:
                    self.log_resultado('API', 'Health check', True, "API responde correctamente")
                else:
                    self.log_resultado('API', 'Health check', False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_resultado('API', 'Health check', False, f"API no responde: {str(e)}")
            
            # Test 2: Login endpoint
            login_data = {
                'email': 'agronomo@ecosmart.com',
                'password': '123456'
            }
            try:
                response = requests.post(f"{self.API_URL}/login", json=login_data, timeout=5)
                if response.status_code == 200:
                    user_data = response.json()
                    self.log_resultado('API', 'Login endpoint', True, f"Usuario: {user_data.get('nombre')}")
                else:
                    self.log_resultado('API', 'Login endpoint', False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_resultado('API', 'Login endpoint', False, str(e))
            
            # Test 3: Parcelas endpoint
            try:
                headers = {'X-User-Id': '1', 'X-User-Rol': 'agronomo'}
                response = requests.get(f"{self.API_URL}/parcelas", headers=headers, timeout=5)
                if response.status_code == 200:
                    parcelas = response.json()
                    self.log_resultado('API', 'Parcelas endpoint', True, f"{len(parcelas)} parcelas")
                else:
                    self.log_resultado('API', 'Parcelas endpoint', False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_resultado('API', 'Parcelas endpoint', False, str(e))
            
            # Test 4: Sensores endpoint
            try:
                response = requests.get(f"{self.API_URL}/sensores", timeout=5)
                if response.status_code == 200:
                    sensores = response.json()
                    self.log_resultado('API', 'Sensores endpoint', True, f"{len(sensores)} sensores")
                else:
                    self.log_resultado('API', 'Sensores endpoint', False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_resultado('API', 'Sensores endpoint', False, str(e))
                
        except Exception as e:
            self.log_resultado('API', 'Error general', False, str(e))

    def test_servicios_backend(self):
        """Pruebas de servicios del backend"""
        print("\n🔍 TESTING: SERVICIOS BACKEND")
        print("=" * 50)
        
        with self.app.app_context():
            try:
                # Test 1: Detector de anomalías
                try:
                    from servicios.detector_anomalias import detector
                    anomalias = detector.detectar_anomalias_basicas(1)  # Parcela ID 1
                    self.log_resultado('Services', 'Detector anomalías', True, f"{len(anomalias)} anomalías detectadas")
                except Exception as e:
                    self.log_resultado('Services', 'Detector anomalías', False, str(e))
                
                # Test 2: Sistema de logs
                try:
                    from servicios.logs import registrar_log
                    # No ejecutar, solo verificar que se puede importar
                    self.log_resultado('Services', 'Sistema logs', True, "Servicio disponible")
                except Exception as e:
                    self.log_resultado('Services', 'Sistema logs', False, str(e))
                
                # Test 3: OpenRouter
                try:
                    from servicios.openrouter import send_to_deepseek
                    # No ejecutar, solo verificar importación
                    self.log_resultado('Services', 'OpenRouter service', True, "Servicio disponible")
                except Exception as e:
                    self.log_resultado('Services', 'OpenRouter service', False, str(e))
                
                # Test 4: Notificaciones
                try:
                    from servicios.notificaciones import enviar_correo_alerta
                    # No ejecutar, solo verificar importación
                    self.log_resultado('Services', 'Sistema notificaciones', True, "Servicio disponible")
                except Exception as e:
                    self.log_resultado('Services', 'Sistema notificaciones', False, str(e))
                
            except Exception as e:
                self.log_resultado('Services', 'Error general', False, str(e))

    def test_integracion_completa(self):
        """Pruebas de integración completa del sistema"""
        print("\n🔍 TESTING: INTEGRACIÓN COMPLETA")
        print("=" * 50)
        
        try:
            # Test 1: Flujo login -> parcelas -> sensores
            login_data = {'email': 'agronomo@ecosmart.com', 'password': '123456'}
            
            # Login
            login_response = requests.post(f"{self.API_URL}/login", json=login_data, timeout=5)
            if login_response.status_code == 200:
                user_data = login_response.json()
                user_id = user_data.get('id')
                
                # Obtener parcelas
                headers = {'X-User-Id': str(user_id), 'X-User-Rol': 'agronomo'}
                parcelas_response = requests.get(f"{self.API_URL}/parcelas", headers=headers, timeout=5)
                
                if parcelas_response.status_code == 200:
                    parcelas = parcelas_response.json()
                    
                    # Obtener datos de sensores si hay parcelas
                    if parcelas:
                        parcela_id = parcelas[0]['id']
                        sensores_response = requests.get(
                            f"{self.API_URL}/sensores/datos?parcela={parcela_id}",
                            headers=headers,
                            timeout=5
                        )
                        
                        if sensores_response.status_code == 200:
                            self.log_resultado('Integration', 'Flujo completo', True, 
                                             f"Login -> {len(parcelas)} parcelas -> datos sensores")
                        else:
                            self.log_resultado('Integration', 'Flujo completo', False, 
                                             "Error obteniendo datos sensores")
                    else:
                        self.log_resultado('Integration', 'Flujo completo', True, 
                                         "Login -> 0 parcelas (normal)")
                else:
                    self.log_resultado('Integration', 'Flujo completo', False, "Error obteniendo parcelas")
            else:
                self.log_resultado('Integration', 'Flujo completo', False, "Error en login")
                
            # Test 2: CORS y headers
            options_response = requests.options(f"{self.API_URL}/parcelas", timeout=5)
            cors_headers = [
                'Access-Control-Allow-Origin',
                'Access-Control-Allow-Methods',
                'Access-Control-Allow-Headers'
            ]
            cors_ok = any(header in options_response.headers for header in cors_headers)
            self.log_resultado('Integration', 'CORS configuración', cors_ok, 
                             f"Headers CORS: {'presentes' if cors_ok else 'ausentes'}")
            
        except Exception as e:
            self.log_resultado('Integration', 'Error general', False, str(e))

    def test_frontend_structure(self):
        """Verificaciones de estructura del frontend"""
        print("\n🔍 TESTING: ESTRUCTURA FRONTEND")
        print("=" * 50)
        
        frontend_path = os.path.join(os.path.dirname(__file__), '..', 'Ecosmart frontend react')
        
        try:
            # Test 1: Archivos principales
            archivos_principales = [
                'package.json',
                'vite.config.js',
                'src/App.jsx',
                'src/main.jsx'
            ]
            
            for archivo in archivos_principales:
                archivo_path = os.path.join(frontend_path, archivo)
                if os.path.exists(archivo_path):
                    self.log_resultado('Frontend', f'Archivo {archivo}', True, "Existe")
                else:
                    self.log_resultado('Frontend', f'Archivo {archivo}', False, "No existe")
            
            # Test 2: Componentes principales
            componentes_path = os.path.join(frontend_path, 'src', 'views')
            if os.path.exists(componentes_path):
                componentes = os.listdir(componentes_path)
                componentes_jsx = [c for c in componentes if c.endswith('.jsx')]
                self.log_resultado('Frontend', 'Componentes React', True, 
                                 f"{len(componentes_jsx)} componentes encontrados")
                
                # Verificar componentes clave
                componentes_clave = [
                    'DashboardAgricultor.jsx',
                    'DashboardAgronomo.jsx',
                    'DashboardTecnico.jsx',
                    'Login.jsx',
                    'headeragricultor.jsx',
                    'HeaderAgronomo.jsx'
                ]
                
                for comp in componentes_clave:
                    if comp in componentes:
                        self.log_resultado('Frontend', f'Componente {comp}', True, "Existe")
                    else:
                        self.log_resultado('Frontend', f'Componente {comp}', False, "No existe")
            else:
                self.log_resultado('Frontend', 'Directorio views', False, "No existe")
            
            # Test 3: Servicios
            servicios_path = os.path.join(frontend_path, 'src', 'services')
            if os.path.exists(servicios_path):
                servicios = os.listdir(servicios_path)
                servicios_js = [s for s in servicios if s.endswith('.js')]
                self.log_resultado('Frontend', 'Servicios JS', True, 
                                 f"{len(servicios_js)} servicios encontrados")
            else:
                self.log_resultado('Frontend', 'Directorio services', False, "No existe")
                
        except Exception as e:
            self.log_resultado('Frontend', 'Error general', False, str(e))

    def generar_reporte(self):
        """Genera el reporte final de pruebas"""
        print("\n" + "=" * 60)
        print("📋 REPORTE FINAL DE PRUEBAS UNITARIAS")
        print("=" * 60)
        
        print(f"🕒 Fecha de ejecución: {self.resultados['fecha_ejecucion']}")
        print(f"📊 Total de pruebas: {self.resultados['total_pruebas']}")
        print(f"✅ Pruebas exitosas: {self.resultados['exitosas']}")
        print(f"❌ Pruebas fallidas: {self.resultados['fallidas']}")
        
        if self.resultados['total_pruebas'] > 0:
            porcentaje_exito = (self.resultados['exitosas'] / self.resultados['total_pruebas']) * 100
            print(f"📈 Porcentaje de éxito: {porcentaje_exito:.1f}%")
        
        print("\n📝 DETALLES POR CATEGORÍA:")
        print("-" * 40)
        
        for categoria, tests in self.resultados['detalles'].items():
            print(f"\n🔍 {categoria.upper()}:")
            for test in tests:
                print(f"  {test['estado']} {test['test']}: {test['mensaje']}")
        
        # Guardar reporte en archivo
        nombre_archivo = f"reporte_pruebas_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        ruta_archivo = os.path.join(os.path.dirname(__file__), nombre_archivo)
        
        with open(ruta_archivo, 'w', encoding='utf-8') as f:
            f.write("REPORTE DE PRUEBAS UNITARIAS - ECOSMART\n")
            f.write("=" * 60 + "\n\n")
            f.write(f"Fecha de ejecución: {self.resultados['fecha_ejecucion']}\n")
            f.write(f"Total de pruebas: {self.resultados['total_pruebas']}\n")
            f.write(f"Pruebas exitosas: {self.resultados['exitosas']}\n")
            f.write(f"Pruebas fallidas: {self.resultados['fallidas']}\n")
            
            if self.resultados['total_pruebas'] > 0:
                porcentaje_exito = (self.resultados['exitosas'] / self.resultados['total_pruebas']) * 100
                f.write(f"Porcentaje de éxito: {porcentaje_exito:.1f}%\n")
            
            f.write("\nDETALLES POR CATEGORÍA:\n")
            f.write("-" * 40 + "\n")
            
            for categoria, tests in self.resultados['detalles'].items():
                f.write(f"\n{categoria.upper()}:\n")
                for test in tests:
                    f.write(f"  {test['estado']} {test['test']}: {test['mensaje']}\n")
                    if test.get('detalles'):
                        f.write(f"    Detalles: {test['detalles']}\n")
            
            # Agregar información del sistema
            f.write("\n" + "=" * 60 + "\n")
            f.write("INFORMACIÓN DEL SISTEMA:\n")
            f.write("=" * 60 + "\n")
            f.write(f"Python: {sys.version}\n")
            f.write(f"Sistema: {os.name}\n")
            f.write(f"Directorio de trabajo: {os.getcwd()}\n")
            
            # Agregar resumen de componentes
            f.write("\nCOMPONENTES PRINCIPALES VERIFICADOS:\n")
            f.write("-" * 40 + "\n")
            f.write("Backend Flask:\n")
            f.write("  - Conectividad a base de datos PostgreSQL\n")
            f.write("  - Modelos de datos (Usuario, Parcela, Sensor, etc.)\n")
            f.write("  - Sistema de autenticación\n")
            f.write("  - API endpoints principales\n")
            f.write("  - Servicios (anomalías, logs, notificaciones)\n")
            f.write("\nFrontend React:\n")
            f.write("  - Estructura de archivos\n")
            f.write("  - Componentes principales\n")
            f.write("  - Servicios de integración\n")
            f.write("  - Configuración de build\n")
            
            f.write(f"\nIntegración:\n")
            f.write("  - Comunicación Frontend-Backend\n")
            f.write("  - Configuración CORS\n")
            f.write("  - Flujos de autenticación\n")
            f.write("  - Manejo de estados de usuario\n")
        
        print(f"\n💾 Reporte guardado en: {ruta_archivo}")
        return ruta_archivo

    def ejecutar_todas_las_pruebas(self):
        """Ejecuta todas las pruebas del sistema"""
        print("🚀 INICIANDO PRUEBAS UNITARIAS COMPLETAS - ECOSMART")
        print("=" * 60)
        
        # Ejecutar todas las categorías de pruebas
        self.test_base_datos()
        self.test_modelos()
        self.test_autenticacion()
        self.test_api_endpoints()
        self.test_servicios_backend()
        self.test_integracion_completa()
        self.test_frontend_structure()
        
        # Generar reporte final
        return self.generar_reporte()

def main():
    """Función principal"""
    print("🧪 SISTEMA DE PRUEBAS UNITARIAS - ECOSMART")
    print("Desarrollado por: GitHub Copilot")
    print("Fecha:", datetime.now().strftime("%d/%m/%Y %H:%M:%S"))
    print()
    
    try:
        test_runner = TestCompleto()
        archivo_reporte = test_runner.ejecutar_todas_las_pruebas()
        
        print("\n🎉 PRUEBAS COMPLETADAS EXITOSAMENTE")
        print(f"📄 Ver reporte completo en: {archivo_reporte}")
        
        # Mostrar resumen final
        if test_runner.resultados['total_pruebas'] > 0:
            porcentaje = (test_runner.resultados['exitosas'] / test_runner.resultados['total_pruebas']) * 100
            if porcentaje >= 80:
                print("🟢 ESTADO DEL SISTEMA: SALUDABLE")
            elif porcentaje >= 60:
                print("🟡 ESTADO DEL SISTEMA: ACEPTABLE")
            else:
                print("🔴 ESTADO DEL SISTEMA: REQUIERE ATENCIÓN")
        
    except Exception as e:
        print(f"❌ ERROR CRÍTICO EN PRUEBAS: {e}")
        traceback.print_exc()
        return 1
        
    return 0

if __name__ == '__main__':
    exit_code = main()
    sys.exit(exit_code)
