import statistics
from datetime import datetime, timedelta
from modelos.models import db, LecturaSensor, Parcela, RangoParametro  # ← AGREGAR RangoParametro

class DetectorAnomalias:
    def __init__(self):
        # ELIMINAR ESTE BLOQUE (líneas 7-12):
        # self.umbrales = {
        #     'temperatura': {'min': 15, 'max': 30},
        #     'humedad': {'min': 40, 'max': 90},
        #     'ph del suelo': {'min': 6.0, 'max': 7.5},
        #     'nutrientes': {'min': 50, 'max': 200}
        # }
        pass  # ← REEMPLAZAR con esto
    
    def detectar_anomalias_basicas(self, parcela_id=None):
        """Detecta anomalías usando rangos configurables de BD"""
        anomalias = []
        
        # Obtener lecturas de las últimas 24 horas
        fecha_limite = datetime.now() - timedelta(hours=24)
        
        query = LecturaSensor.query.filter(LecturaSensor.timestamp >= fecha_limite)
        if parcela_id:
            query = query.filter(LecturaSensor.parcela == parcela_id)
        
        lecturas = query.all()
        
        for lectura in lecturas:
            anomalia = self._evaluar_lectura_con_rangos_bd(lectura)  # ← CAMBIAR NOMBRE
            if anomalia:
                anomalias.append(anomalia)
        
        return anomalias
    
    def _evaluar_lectura_con_rangos_bd(self, lectura):  # ← RENOMBRAR Y MODIFICAR FUNCIÓN
        """Evalúa si una lectura es anómala usando rangos de BD"""
        try:
            valor = float(lectura.valor)
        except (ValueError, TypeError):
            return None
        
        # Obtener información de la parcela
        parcela = Parcela.query.get(lectura.parcela)
        cultivo = parcela.cultivo_actual if parcela else None
        
        # Mapear tipo de sensor a tipo de parámetro
        tipo_parametro = self._mapear_tipo_sensor(lectura.tipo)
        if not tipo_parametro:
            return None
        
        # Obtener rango configurado (con prioridad: parcela > cultivo > global)
        rango = RangoParametro.obtener_rango_para_parametro(
            tipo_parametro=tipo_parametro,
            cultivo=cultivo,
            parcela_id=lectura.parcela
        )
        
        if not rango:
            # Si no hay rango configurado, no detectar anomalía
            return None
        
        # Verificar si hay anomalía
        severidad = rango.determinar_severidad(valor)
        if severidad:
            # Generar mensaje descriptivo
            mensaje = rango.obtener_mensaje_anomalia(valor, tipo_parametro)
            
            return {
                'id': f"anomalia_{lectura.id}",
                'parcela_id': lectura.parcela,
                'tipo': tipo_parametro,
                'valor': valor,
                'valor_esperado': f"{rango.valor_minimo}-{rango.valor_maximo}",
                'severidad': severidad,
                'mensaje': mensaje,
                'timestamp': lectura.timestamp.isoformat(),
                'tipo_anomalia': 'umbral_minimo' if valor < rango.valor_minimo else 'umbral_maximo',
                'rango_usado': {
                    'tipo': 'parcela' if rango.parcela_id else ('cultivo' if rango.cultivo else 'global'),
                    'descripcion': f"Rango para {rango.cultivo or 'Global'}" + (f" - Parcela {rango.parcela.nombre}" if rango.parcela else "")
                }
            }
        
        return None
    
    def _mapear_tipo_sensor(self, tipo_sensor):
        """Mapea los tipos de sensor a tipos de parámetro en la BD"""
        mapeo = {
            'temperatura': 'temperatura',
            'temperature': 'temperatura',
            'temp': 'temperatura',
            'humedad': 'humedad',
            'humidity': 'humedad',
            'hum': 'humedad',
            'ph': 'ph',
            'ph del suelo': 'ph',
            'pH': 'ph',
            'nutrientes': 'nutrientes',
            'nutrients': 'nutrientes'
        }
        
        return mapeo.get(tipo_sensor.lower())
    
    # MANTENER LA FUNCIÓN obtener_salud_parcela SIN CAMBIOS
    def obtener_salud_parcela(self, parcela_id):
        """Calcula score de salud de una parcela (0-100)"""
        anomalias = self.detectar_anomalias_basicas(parcela_id)
        
        if not anomalias:
            return 100
        
        # Calcular penalización por anomalías
        penalizacion = 0
        for anomalia in anomalias:
            if anomalia['severidad'] == 'alto':
                penalizacion += 20
            elif anomalia['severidad'] == 'medio':
                penalizacion += 10
            else:
                penalizacion += 5
        
        salud = max(0, 100 - penalizacion)
        return salud

# Instancia global - MANTENER SIN CAMBIOS
detector = DetectorAnomalias()