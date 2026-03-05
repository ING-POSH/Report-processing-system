# Configuration for Report Processing Bot

import os
from datetime import datetime

class Config:
    # API Keys
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', 'your-openai-key-here')
    WHISPER_API_KEY = os.getenv('WHISPER_API_KEY', 'your-whisper-key-here')
    
    # Server Configuration
    HOST = 'localhost'
    PORT = 8080
    DEBUG = True
    
    # File Paths
    UPLOAD_FOLDER = 'uploads'
    PROCESSED_FOLDER = 'processed'
    TEMP_FOLDER = 'temp'
    LOG_FOLDER = 'logs'
    
    # Processing Settings
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
    SUPPORTED_FORMATS = {
        'documents': ['.docx', '.doc', '.pdf', '.txt', '.md'],
        'audio': ['.mp3', '.wav', '.m4a', '.flac', '.aac']
    }
    
    # Standard Format Configuration
    STANDARD_TEMPLATE = {
        'header': {
            'title': 'Report Title',
            'date': datetime.now().strftime('%Y-%m-%d'),
            'author': 'Processed by Report Bot'
        },
        'sections': ['Executive Summary', 'Main Content', 'Key Points', 'Recommendations', 'Next Steps'],
        'formatting': {
            'font': 'Arial',
            'font_size': 12,
            'line_spacing': 1.5,
            'margins': {'top': 1, 'bottom': 1, 'left': 1, 'right': 1}
        }
    }
    
    # Progress Tracking
    PROGRESS_UPDATE_INTERVAL = 1  # seconds
    DATABASE_URL = 'sqlite:///report_bot.db'
    
    # Logging
    LOG_LEVEL = 'INFO'
    LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'

# Development Configuration
class DevelopmentConfig(Config):
    DEBUG = True
    PORT = 8080

# Production Configuration  
class ProductionConfig(Config):
    DEBUG = False
    PORT = 80
    HOST = '0.0.0.0'

# Test Configuration
class TestConfig(Config):
    TESTING = True
    DATABASE_URL = 'sqlite:///test_report_bot.db'