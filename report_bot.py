#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Report Processing Bot - Core Engine
Main processing engine for handling documents and audio files
Authors: AI Assistant
Date: February 26, 2026
"""

import os
import logging
import asyncio
import threading
from datetime import datetime
from typing import List, Dict, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum

from config import Config
from document_processor import DocumentProcessor
from audio_transcriber import AudioTranscriber
from format_standardizer import FormatStandardizer
from progress_tracker import ProgressTracker
from database import DatabaseManager

# Configure logging
logging.basicConfig(
    level=getattr(logging, Config.LOG_LEVEL),
    format=Config.LOG_FORMAT,
    handlers=[
        logging.FileHandler(f'{Config.LOG_FOLDER}/report_bot.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class ProcessingStatus(Enum):
    """Processing status enumeration"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

@dataclass
class ReportTask:
    """Data class for report processing tasks"""
    task_id: str
    file_path: str
    file_type: str
    original_name: str
    status: ProcessingStatus
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    progress: float = 0.0
    result_path: Optional[str] = None

class ReportProcessingBot:
    """Main Report Processing Bot class"""
    
    def __init__(self, config: Config = Config):
        self.config = config
        self.tasks: Dict[str, ReportTask] = {}
        self.processors = {
            'document': DocumentProcessor(config),
            'audio': AudioTranscriber(config),
            'standardizer': FormatStandardizer(config)
        }
        self.progress_tracker = ProgressTracker(config)
        self.db = DatabaseManager(config.DATABASE_URL)
        self.is_running = False
        self.processing_thread = None
        
        # Create necessary directories
        self._create_directories()
        
        logger.info("Report Processing Bot initialized successfully")
    
    def _create_directories(self):
        """Create necessary directories for file handling"""
        directories = [
            self.config.UPLOAD_FOLDER,
            self.config.PROCESSED_FOLDER,
            self.config.TEMP_FOLDER,
            self.config.LOG_FOLDER
        ]
        
        for directory in directories:
            os.makedirs(directory, exist_ok=True)
            logger.debug(f"Created directory: {directory}")
    
    def start(self):
        """Start the report processing bot"""
        if self.is_running:
            logger.warning("Bot is already running")
            return
        
        self.is_running = True
        self.processing_thread = threading.Thread(target=self._processing_loop)
        self.processing_thread.daemon = True
        self.processing_thread.start()
        
        logger.info("Report Processing Bot started successfully")
        return True
    
    def stop(self):
        """Stop the report processing bot"""
        if not self.is_running:
            logger.warning("Bot is not running")
            return
        
        self.is_running = False
        if self.processing_thread:
            self.processing_thread.join(timeout=5)
        
        logger.info("Report Processing Bot stopped")
        return True
    
    def _processing_loop(self):
        """Main processing loop running in background thread"""
        while self.is_running:
            try:
                # Process pending tasks
                pending_tasks = [
                    task for task in self.tasks.values() 
                    if task.status == ProcessingStatus.PENDING
                ]
                
                for task in pending_tasks:
                    self._process_task(task)
                
                # Update progress tracking
                self.progress_tracker.update_all_progress(self.tasks)
                
                # Small delay to prevent busy waiting
                asyncio.sleep(0.1)
                
            except Exception as e:
                logger.error(f"Error in processing loop: {e}")
    
    def submit_file(self, file_path: str, task_id: str = None) -> str:
        """Submit a file for processing"""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
        
        if not task_id:
            task_id = f"task_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}"
        
        # Determine file type
        file_extension = os.path.splitext(file_path)[1].lower()
        file_type = self._determine_file_type(file_extension)
        
        # Create task
        task = ReportTask(
            task_id=task_id,
            file_path=file_path,
            file_type=file_type,
            original_name=os.path.basename(file_path),
            status=ProcessingStatus.PENDING,
            created_at=datetime.now()
        )
        
        self.tasks[task_id] = task
        self.db.save_task(task)
        
        logger.info(f"Submitted task {task_id} for file: {file_path}")
        return task_id
    
    def _determine_file_type(self, extension: str) -> str:
        """Determine file type based on extension"""
        document_extensions = self.config.SUPPORTED_FORMATS['documents']
        audio_extensions = self.config.SUPPORTED_FORMATS['audio']
        
        if extension in document_extensions:
            return 'document'
        elif extension in audio_extensions:
            return 'audio'
        else:
            return 'unknown'
    
    def _process_task(self, task: ReportTask):
        """Process a single task"""
        try:
            task.status = ProcessingStatus.PROCESSING
            task.started_at = datetime.now()
            self.db.update_task(task)
            
            logger.info(f"Processing task {task.task_id}: {task.original_name}")
            
            # Process based on file type
            if task.file_type == 'document':
                result = self._process_document(task)
            elif task.file_type == 'audio':
                result = self._process_audio(task)
            else:
                raise ValueError(f"Unsupported file type: {task.file_type}")
            
            # Standardize format
            standardized_result = self.processors['standardizer'].standardize(
                result, task.original_name
            )
            
            # Save result
            output_path = os.path.join(
                self.config.PROCESSED_FOLDER, 
                f"processed_{task.task_id}_{task.original_name}"
            )
            self._save_result(standardized_result, output_path)
            
            # Update task
            task.status = ProcessingStatus.COMPLETED
            task.completed_at = datetime.now()
            task.progress = 100.0
            task.result_path = output_path
            
            self.db.update_task(task)
            logger.info(f"Task {task.task_id} completed successfully")
            
        except Exception as e:
            task.status = ProcessingStatus.FAILED
            task.error_message = str(e)
            task.completed_at = datetime.now()
            self.db.update_task(task)
            logger.error(f"Task {task.task_id} failed: {e}")
    
    def _process_document(self, task: ReportTask) -> str:
        """Process document file"""
        processor = self.processors['document']
        return processor.extract_text(task.file_path)
    
    def _process_audio(self, task: ReportTask) -> str:
        """Process audio file"""
        transcriber = self.processors['audio']
        return transcriber.transcribe(task.file_path)
    
    def _save_result(self, content: str, output_path: str):
        """Save processed result to file"""
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(content)
    
    def get_task_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get status of a specific task"""
        task = self.tasks.get(task_id)
        if not task:
            return None
        
        return {
            'task_id': task.task_id,
            'status': task.status.value,
            'progress': task.progress,
            'created_at': task.created_at.isoformat(),
            'started_at': task.started_at.isoformat() if task.started_at else None,
            'completed_at': task.completed_at.isoformat() if task.completed_at else None,
            'error_message': task.error_message,
            'result_path': task.result_path
        }
    
    def get_all_tasks(self) -> List[Dict[str, Any]]:
        """Get status of all tasks"""
        return [self.get_task_status(task_id) for task_id in self.tasks.keys()]
    
    def get_progress_summary(self) -> Dict[str, Any]:
        """Get overall progress summary"""
        total_tasks = len(self.tasks)
        completed_tasks = len([
            task for task in self.tasks.values() 
            if task.status == ProcessingStatus.COMPLETED
        ])
        failed_tasks = len([
            task for task in self.tasks.values() 
            if task.status == ProcessingStatus.FAILED
        ])
        pending_tasks = len([
            task for task in self.tasks.values() 
            if task.status == ProcessingStatus.PENDING
        ])
        processing_tasks = len([
            task for task in self.tasks.values() 
            if task.status == ProcessingStatus.PROCESSING
        ])
        
        return {
            'total_tasks': total_tasks,
            'completed_tasks': completed_tasks,
            'failed_tasks': failed_tasks,
            'pending_tasks': pending_tasks,
            'processing_tasks': processing_tasks,
            'completion_rate': (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
        }

# Main execution
if __name__ == "__main__":
    bot = ReportProcessingBot()
    bot.start()
    
    try:
        # Keep the main thread alive
        while True:
            pass
    except KeyboardInterrupt:
        logger.info("Shutting down Report Processing Bot...")
        bot.stop()
        logger.info("Bot shutdown complete")