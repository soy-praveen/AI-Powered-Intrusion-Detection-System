from flask import Blueprint, render_template, redirect, url_for

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def index():
    return redirect(url_for('dashboard.dashboard_home'))

@main_bp.route('/health')
def health_check():
    return {'status': 'healthy', 'service': 'AI-IDS'}, 200
