from flask import Blueprint, request, jsonify, current_app
from app.models.ml_models import MLModelManager
from app.utils.data_processor import DataProcessor
from app.utils.threat_analyzer import RealTimeThreatAnalyzer
import numpy as np
import pandas as pd
from datetime import datetime
import threading

api_bp = Blueprint('api', __name__)

# Global instances (in production, use proper dependency injection)
model_manager = None
data_processor = None
threat_analyzer = None

def initialize_components():
    global model_manager, data_processor, threat_analyzer
    
    if model_manager is None:
        model_manager = MLModelManager()
        data_processor = DataProcessor()
        
        # Load pre-trained models if available
        try:
            model_manager.load_models(current_app.config['MODEL_PATH'])
            data_processor.load_preprocessor(
                f"{current_app.config['MODEL_PATH']}/preprocessor.pkl"
            )
        except Exception as e:
            print(f"Warning: Could not load pre-trained models: {e}")
        
        threat_analyzer = RealTimeThreatAnalyzer(
            model_manager, data_processor, current_app.config
        )

@api_bp.before_request
def before_request():
    initialize_components()

@api_bp.route('/predict', methods=['POST'])
def predict_threat():
    """API endpoint for threat prediction"""
    try:
        data = request.get_json()
        
        if 'features' not in data:
            return jsonify({'error': 'Features not provided'}), 400
        
        features = np.array(data['features']).reshape(1, -1)
        
        # Make ensemble prediction
        ensemble_pred, individual_preds = model_manager.ensemble_predict(features)
        
        if ensemble_pred is None:
            return jsonify({'error': 'No models available for prediction'}), 500
        
        # Process prediction results
        max_prob = np.max(ensemble_pred[0])
        predicted_class = np.argmax(ensemble_pred[0])
        
        result = {
            'threat_detected': bool(predicted_class > 0),
            'threat_type': threat_analyzer.get_threat_type(predicted_class),
            'confidence': float(max_prob),
            'timestamp': datetime.now().isoformat(),
            'predictions': {
                'ensemble': ensemble_pred[0].tolist(),
                'individual': {
                    name: pred[0].tolist() 
                    for name, pred in individual_preds.items()
                }
            }
        }
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/start-monitoring', methods=['POST'])
def start_monitoring():
    """Start real-time network monitoring"""
    try:
        data = request.get_json() or {}
        interface = data.get('interface')
        
        success = threat_analyzer.start_monitoring(interface)
        
        if success:
            return jsonify({
                'status': 'success',
                'message': 'Network monitoring started',
                'monitoring_active': True
            })
        else:
            return jsonify({
                'status': 'error',
                'message': 'Monitoring already active or failed to start'
            }), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/stop-monitoring', methods=['POST'])
def stop_monitoring():
    """Stop real-time network monitoring"""
    try:
        threat_analyzer.stop_monitoring()
        
        return jsonify({
            'status': 'success',
            'message': 'Network monitoring stopped',
            'monitoring_active': False
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/threats/recent')
def get_recent_threats():
    """Get recent threat detections"""
    try:
        limit = request.args.get('limit', 50, type=int)
        threats = threat_analyzer.get_recent_threats(limit)
        
        return jsonify({
            'threats': threats,
            'count': len(threats)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/stats')
def get_system_stats():
    """Get system statistics"""
    try:
        stats = threat_analyzer.get_system_stats()
        threat_summary = threat_analyzer.get_threat_summary()
        
        return jsonify({
            'system_stats': stats,
            'threat_summary': threat_summary,
            'monitoring_active': threat_analyzer.monitoring_active
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/model/performance')
def get_model_performance():
    """Get model performance metrics"""
    try:
        return jsonify({
            'performance': model_manager.model_performance,
            'available_models': list(model_manager.models.keys())
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/explain/<model_name>', methods=['POST'])
def explain_prediction(model_name):
    """Get SHAP explanation for prediction"""
    try:
        data = request.get_json()
        
        if 'features' not in data:
            return jsonify({'error': 'Features not provided'}), 400
        
        features = np.array(data['features']).reshape(1, -1)
        
        shap_values = model_manager.explain_prediction(features, model_name)
        
        if shap_values is None:
            return jsonify({'error': 'Model not available or explanation not supported'}), 400
        
        return jsonify({
            'shap_values': shap_values.tolist() if hasattr(shap_values, 'tolist') else shap_values,
            'feature_names': data_processor.feature_columns
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
