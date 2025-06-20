import os
from datetime import timedelta

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'your-secret-key-here'
    
    # Database Configuration
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///ids.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Redis Configuration
    REDIS_URL = os.environ.get('REDIS_URL') or 'redis://localhost:6379/0'
    
    # ML Model Paths
    MODEL_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'models')
    DATA_PATH = os.path.join(os.path.dirname(__file__), '..', 'data')
    
    # Real-time Processing
    BATCH_SIZE = 1000
    PREDICTION_THRESHOLD = 0.7
    
    # Dashboard Settings
    MAX_ALERTS = 1000
    ALERT_RETENTION_DAYS = 30
    
    # Network Monitoring
    NETWORK_INTERFACE = 'eth0'
    PACKET_CAPTURE_TIMEOUT = 1.0

class DevelopmentConfig(Config):
    DEBUG = True
    TESTING = False

class ProductionConfig(Config):
    DEBUG = False
    TESTING = False

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
