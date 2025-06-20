import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
import joblib
import os

class DataProcessor:
    def __init__(self):
        self.scaler = StandardScaler()
        self.label_encoder = LabelEncoder()
        self.feature_columns = None
        
    def load_nsl_kdd_data(self, file_path):
        """Load and preprocess NSL-KDD dataset"""
        column_names = [
            'duration', 'protocol_type', 'service', 'flag', 'src_bytes',
            'dst_bytes', 'land', 'wrong_fragment', 'urgent', 'hot',
            'num_failed_logins', 'logged_in', 'num_compromised', 'root_shell',
            'su_attempted', 'num_root', 'num_file_creations', 'num_shells',
            'num_access_files', 'num_outbound_cmds', 'is_host_login',
            'is_guest_login', 'count', 'srv_count', 'serror_rate',
            'srv_serror_rate', 'rerror_rate', 'srv_rerror_rate',
            'same_srv_rate', 'diff_srv_rate', 'srv_diff_host_rate',
            'dst_host_count', 'dst_host_srv_count', 'dst_host_same_srv_rate',
            'dst_host_diff_srv_rate', 'dst_host_same_src_port_rate',
            'dst_host_srv_diff_host_rate', 'dst_host_serror_rate',
            'dst_host_srv_serror_rate', 'dst_host_rerror_rate',
            'dst_host_srv_rerror_rate', 'attack_type', 'difficulty'
        ]
        
        df = pd.read_csv(file_path, names=column_names)
        return self.preprocess_data(df)
    
    def preprocess_data(self, df):
        """Comprehensive data preprocessing"""
        # Remove difficulty column if present
        if 'difficulty' in df.columns:
            df = df.drop('difficulty', axis=1)
        
        # Handle categorical variables
        categorical_columns = ['protocol_type', 'service', 'flag']
        for col in categorical_columns:
            if col in df.columns:
                df[col] = pd.Categorical(df[col]).codes
        
        # Create binary classification (normal vs attack)
        if 'attack_type' in df.columns:
            df['is_attack'] = (df['attack_type'] != 'normal').astype(int)
            
            # Create multi-class labels
            attack_mapping = {
                'normal': 0,
                'dos': 1, 'ddos': 1, 'neptune': 1, 'smurf': 1, 'pod': 1,
                'teardrop': 1, 'land': 1, 'back': 1, 'apache2': 1, 'mailbomb': 1,
                'probe': 2, 'satan': 2, 'ipsweep': 2, 'nmap': 2, 'portsweep': 2,
                'mscan': 2, 'saint': 2,
                'r2l': 3, 'guess_passwd': 3, 'ftp_write': 3, 'imap': 3,
                'phf': 3, 'multihop': 3, 'warezmaster': 3, 'warezclient': 3,
                'spy': 3, 'xlock': 3, 'xsnoop': 3, 'snmpguess': 3,
                'u2r': 4, 'buffer_overflow': 4, 'loadmodule': 4, 'perl': 4,
                'rootkit': 4, 'httptunnel': 4, 'ps': 4, 'sqlattack': 4, 'xterm': 4
            }
            
            df['attack_category'] = df['attack_type'].map(
                lambda x: attack_mapping.get(x.lower(), 0)
            )
            
            # Store feature columns
            self.feature_columns = [col for col in df.columns 
                                  if col not in ['attack_type', 'is_attack', 'attack_category']]
        
        return df
    
    def extract_features(self, df):
        """Extract and engineer features"""
        if self.feature_columns is None:
            self.feature_columns = [col for col in df.columns 
                                  if col not in ['attack_type', 'is_attack', 'attack_category']]
        
        X = df[self.feature_columns].copy()
        
        # Handle missing values
        X = X.fillna(X.median())
        
        # Feature engineering
        if 'src_bytes' in X.columns and 'dst_bytes' in X.columns:
            X['bytes_ratio'] = X['src_bytes'] / (X['dst_bytes'] + 1)
            X['total_bytes'] = X['src_bytes'] + X['dst_bytes']
        
        if 'count' in X.columns and 'srv_count' in X.columns:
            X['srv_count_ratio'] = X['srv_count'] / (X['count'] + 1)
        
        return X
    
    def scale_features(self, X_train, X_test=None):
        """Scale features using StandardScaler"""
        X_train_scaled = self.scaler.fit_transform(X_train)
        
        if X_test is not None:
            X_test_scaled = self.scaler.transform(X_test)
            return X_train_scaled, X_test_scaled
        
        return X_train_scaled
    
    def save_preprocessor(self, path):
        """Save preprocessing components"""
        joblib.dump({
            'scaler': self.scaler,
            'label_encoder': self.label_encoder,
            'feature_columns': self.feature_columns
        }, path)
    
    def load_preprocessor(self, path):
        """Load preprocessing components"""
        components = joblib.load(path)
        self.scaler = components['scaler']
        self.label_encoder = components['label_encoder']
        self.feature_columns = components['feature_columns']
