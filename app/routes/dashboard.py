from flask import Blueprint, render_template, request, jsonify
from flask_socketio import emit
from app import socketio
import json
from datetime import datetime, timedelta

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/')
def dashboard_home():
    return render_template('dashboard.html')

@dashboard_bp.route('/analysis')
def analysis_page():
    return render_template('analysis.html')

@dashboard_bp.route('/alerts')
def alerts_page():
    return render_template('alerts.html')

@socketio.on('connect')
def handle_connect():
    print('Client connected to dashboard')
    emit('status', {'msg': 'Connected to AI-IDS Dashboard'})

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected from dashboard')

@socketio.on('request_stats')
def handle_stats_request():
    # This would be called periodically to update dashboard
    emit('stats_update', {
        'timestamp': datetime.now().isoformat(),
        'threats_detected': 42,
        'packets_analyzed': 15847,
        'system_load': 23.5,
        'memory_usage': 67.2
    })
