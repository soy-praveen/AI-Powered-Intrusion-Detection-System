import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.metrics import classification_report, confusion_matrix
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout, Conv1D, MaxPooling1D, Flatten
import joblib
import shap
from imblearn.over_sampling import SMOTE

class MLModelManager:
    def __init__(self):
        self.models = {}
        self.model_performance = {}
        self.feature_importance = {}
        
    def train_random_forest(self, X_train, y_train, X_test, y_test):
        """Train Random Forest model"""
        print("Training Random Forest...")
        
        # Handle class imbalance
        smote = SMOTE(random_state=42)
        X_train_balanced, y_train_balanced = smote.fit_resample(X_train, y_train)
        
        rf_model = RandomForestClassifier(
            n_estimators=100,
            max_depth=20,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1
        )
        
        rf_model.fit(X_train_balanced, y_train_balanced)
        
        # Predictions
        y_pred = rf_model.predict(X_test)
        y_pred_proba = rf_model.predict_proba(X_test)
        
        # Store model and performance
        self.models['random_forest'] = rf_model
        self.model_performance['random_forest'] = {
            'classification_report': classification_report(y_test, y_pred, output_dict=True),
            'confusion_matrix': confusion_matrix(y_test, y_pred).tolist(),
            'feature_importance': rf_model.feature_importances_.tolist()
        }
        
        return rf_model, y_pred, y_pred_proba
    
    def train_svm(self, X_train, y_train, X_test, y_test):
        """Train SVM model"""
        print("Training SVM...")
        
        svm_model = SVC(
            kernel='rbf',
            C=1.0,
            gamma='scale',
            probability=True,
            random_state=42
        )
        
        svm_model.fit(X_train, y_train)
        
        # Predictions
        y_pred = svm_model.predict(X_test)
        y_pred_proba = svm_model.predict_proba(X_test)
        
        # Store model and performance
        self.models['svm'] = svm_model
        self.model_performance['svm'] = {
            'classification_report': classification_report(y_test, y_pred, output_dict=True),
            'confusion_matrix': confusion_matrix(y_test, y_pred).tolist()
        }
        
        return svm_model, y_pred, y_pred_proba
    
    def build_lstm_model(self, input_shape, num_classes):
        """Build LSTM model architecture"""
        model = Sequential([
            LSTM(128, return_sequences=True, input_shape=input_shape),
            Dropout(0.2),
            LSTM(64, return_sequences=False),
            Dropout(0.2),
            Dense(50, activation='relu'),
            Dropout(0.2),
            Dense(num_classes, activation='softmax' if num_classes > 2 else 'sigmoid')
        ])
        
        model.compile(
            optimizer='adam',
            loss='sparse_categorical_crossentropy' if num_classes > 2 else 'binary_crossentropy',
            metrics=['accuracy']
        )
        
        return model
    
    def train_lstm(self, X_train, y_train, X_test, y_test, epochs=50):
        """Train LSTM model"""
        print("Training LSTM...")
        
        # Reshape data for LSTM
        X_train_lstm = X_train.reshape((X_train.shape[0], 1, X_train.shape[1]))
        X_test_lstm = X_test.reshape((X_test.shape[0], 1, X_test.shape[1]))
        
        num_classes = len(np.unique(y_train))
        lstm_model = self.build_lstm_model((1, X_train.shape[1]), num_classes)
        
        # Callbacks
        early_stopping = tf.keras.callbacks.EarlyStopping(
            monitor='val_loss', patience=10, restore_best_weights=True
        )
        
        reduce_lr = tf.keras.callbacks.ReduceLROnPlateau(
            monitor='val_loss', factor=0.2, patience=5, min_lr=0.001
        )
        
        # Training
        history = lstm_model.fit(
            X_train_lstm, y_train,
            batch_size=32,
            epochs=epochs,
            validation_data=(X_test_lstm, y_test),
            callbacks=[early_stopping, reduce_lr],
            verbose=1
        )
        
        # Predictions
        y_pred_proba = lstm_model.predict(X_test_lstm)
        y_pred = np.argmax(y_pred_proba, axis=1) if num_classes > 2 else (y_pred_proba > 0.5).astype(int)
        
        # Store model and performance
        self.models['lstm'] = lstm_model
        self.model_performance['lstm'] = {
            'classification_report': classification_report(y_test, y_pred, output_dict=True),
            'confusion_matrix': confusion_matrix(y_test, y_pred).tolist(),
            'training_history': {
                'loss': history.history['loss'],
                'accuracy': history.history['accuracy'],
                'val_loss': history.history['val_loss'],
                'val_accuracy': history.history['val_accuracy']
            }
        }
        
        return lstm_model, y_pred, y_pred_proba
    
    def build_cnn_model(self, input_shape, num_classes):
        """Build CNN model for network traffic analysis"""
        model = Sequential([
            Conv1D(64, 3, activation='relu', input_shape=input_shape),
            MaxPooling1D(2),
            Conv1D(128, 3, activation='relu'),
            MaxPooling1D(2),
            Conv1D(64, 3, activation='relu'),
            Flatten(),
            Dense(100, activation='relu'),
            Dropout(0.5),
            Dense(num_classes, activation='softmax' if num_classes > 2 else 'sigmoid')
        ])
        
        model.compile(
            optimizer='adam',
            loss='sparse_categorical_crossentropy' if num_classes > 2 else 'binary_crossentropy',
            metrics=['accuracy']
        )
        
        return model
    
    def ensemble_predict(self, X):
        """Make ensemble predictions using all trained models"""
        predictions = {}
        
        if 'random_forest' in self.models:
            rf_pred = self.models['random_forest'].predict_proba(X)
            predictions['random_forest'] = rf_pred
        
        if 'svm' in self.models:
            svm_pred = self.models['svm'].predict_proba(X)
            predictions['svm'] = svm_pred
        
        if 'lstm' in self.models:
            X_lstm = X.reshape((X.shape[0], 1, X.shape[1]))
            lstm_pred = self.models['lstm'].predict(X_lstm)
            predictions['lstm'] = lstm_pred
        
        # Ensemble averaging
        if predictions:
            ensemble_pred = np.mean(list(predictions.values()), axis=0)
            return ensemble_pred, predictions
        
        return None, predictions
    
    def explain_prediction(self, X_sample, model_name='random_forest'):
        """Generate SHAP explanations for predictions"""
        if model_name not in self.models:
            return None
        
        model = self.models[model_name]
        
        if model_name == 'random_forest':
            explainer = shap.TreeExplainer(model)
            shap_values = explainer.shap_values(X_sample)
            return shap_values
        
        return None
    
    def save_models(self, path):
        """Save all trained models"""
        for name, model in self.models.items():
            if name in ['lstm', 'cnn']:
                model.save(f"{path}/{name}_model.h5")
            else:
                joblib.dump(model, f"{path}/{name}_model.pkl")
        
        # Save performance metrics
        joblib.dump(self.model_performance, f"{path}/model_performance.pkl")
    
    def load_models(self, path):
        """Load pre-trained models"""
        import os
        
        for filename in os.listdir(path):
            if filename.endswith('.pkl') and 'model' in filename:
                model_name = filename.replace('_model.pkl', '')
                self.models[model_name] = joblib.load(f"{path}/{filename}")
            elif filename.endswith('.h5'):
                model_name = filename.replace('_model.h5', '')
                self.models[model_name] = tf.keras.models.load_model(f"{path}/{filename}")
        
        # Load performance metrics
        perf_path = f"{path}/model_performance.pkl"
        if os.path.exists(perf_path):
            self.model_performance = joblib.load(perf_path)
