import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import threading
import queue
import time
from collections import deque
import psutil
import socket
from scapy.all import sniff, IP, TCP, UDP
import json

class RealTimeThreatAnalyzer:
    def __init__(self, model_manager, data_processor, config):
        self.model_manager = model_manager
        self.data_processor = data_processor
        self.config = config
        
        # Real-time data storage
        self.packet_buffer = deque(maxlen=10000)
        self.threat_queue = queue.Queue()
        self.alert_history = deque(maxlen=1000)
        
        # Monitoring flags
        self.monitoring_active = False
        self.monitoring_thread = None
        
        # Statistics
        self.stats = {
            'total_packets': 0,
            'threats_detected': 0,
            'false_positives': 0,
            'system_load': 0.0,
            'memory_usage': 0.0
        }
    
    def extract_packet_features(self, packet):
        """Extract features from network packet"""
        features = {
            'duration': 0,
            'protocol_type': 0,
            'service': 0,
            'flag': 0,
            'src_bytes': 0,
            'dst_bytes': 0,
            'land': 0,
            'wrong_fragment': 0,
            'urgent': 0,
            'hot': 0,
            'num_failed_logins': 0,
            'logged_in': 0,
            'num_compromised': 0,
            'root_shell': 0,
            'su_attempted': 0,
            'num_root': 0,
            'num_file_creations': 0,
            'num_shells': 0,
            'num_access_files': 0,
            'num_outbound_cmds': 0,
            'is_host_login': 0,
            'is_guest_login': 0,
            'count': 1,
            'srv_count': 1,
            'serror_rate': 0,
            'srv_serror_rate': 0,
            'rerror_rate': 0,
            'srv_rerror_rate': 0,
            'same_srv_rate': 0,
            'diff_srv_rate': 0,
            'srv_diff_host_rate': 0,
            'dst_host_count': 1,
            'dst_host_srv_count': 1,
            'dst_host_same_srv_rate': 0,
            'dst_host_diff_srv_rate': 0,
            'dst_host_same_src_port_rate': 0,
            'dst_host_srv_diff_host_rate': 0,
            'dst_host_serror_rate': 0,
            'dst_host_srv_serror_rate': 0,
            'dst_host_rerror_rate': 0,
            'dst_host_srv_rerror_rate': 0
        }
        
        try:
            if IP in packet:
                ip_layer = packet[IP]
                
                # Basic IP features
                features['src_bytes'] = len(packet)
                features['dst_bytes'] = len(packet)
                
                # Protocol type
                if TCP in packet:
                    features['protocol_type'] = 1  # TCP
                    tcp_layer = packet[TCP]
                    
                    # TCP flags
                    if tcp_layer.flags & 0x02:  # SYN
                        features['flag'] = 1
                    elif tcp_layer.flags & 0x10:  # ACK
                        features['flag'] = 2
                    elif tcp_layer.flags & 0x01:  # FIN
                        features['flag'] = 3
                    
                    # Service detection based on port
                    dst_port = tcp_layer.dport
                    if dst_port == 80:
                        features['service'] = 1  # HTTP
                    elif dst_port == 443:
                        features['service'] = 2  # HTTPS
                    elif dst_port == 22:
                        features['service'] = 3  # SSH
                    elif dst_port == 21:
                        features['service'] = 4  # FTP
                    elif dst_port == 25:
                        features['service'] = 5  # SMTP
                    
                elif UDP in packet:
                    features['protocol_type'] = 2  # UDP
                    udp_layer = packet[UDP]
                    
                    # UDP service detection
                    dst_port = udp_layer.dport
                    if dst_port == 53:
                        features['service'] = 6  # DNS
                    elif dst_port == 67 or dst_port == 68:
                        features['service'] = 7  # DHCP
                
                # Land attack detection (same src and dst)
                if ip_layer.src == ip_layer.dst:
                    features['land'] = 1
                
        except Exception as e:
            print(f"Error extracting packet features: {e}")
        
        return features
    
    def packet_handler(self, packet):
        """Handle captured packets"""
        try:
            features = self.extract_packet_features(packet)
            timestamp = datetime.now()
            
            packet_data = {
                'timestamp': timestamp,
                'features': features,
                'raw_packet': packet
            }
            
            self.packet_buffer.append(packet_data)
            self.stats['total_packets'] += 1
            
            # Analyze packet for threats
            self.analyze_packet(packet_data)
            
        except Exception as e:
            print(f"Error handling packet: {e}")
    
    def analyze_packet(self, packet_data):
        """Analyze packet for potential threats"""
        try:
            features = packet_data['features']
            
            # Convert to DataFrame for model prediction
            df = pd.DataFrame([features])
            
            # Ensure all required features are present
            if self.data_processor.feature_columns:
                for col in self.data_processor.feature_columns:
                    if col not in df.columns:
                        df[col] = 0
                
                # Reorder columns to match training data
                df = df[self.data_processor.feature_columns]
            
            # Scale features
            X = self.data_processor.scaler.transform(df)
            
            # Make ensemble prediction
            ensemble_pred, individual_preds = self.model_manager.ensemble_predict(X)
            
            if ensemble_pred is not None:
                # Determine threat level
                max_prob = np.max(ensemble_pred[0])
                predicted_class = np.argmax(ensemble_pred[0])
                
                if max_prob > self.config.PREDICTION_THRESHOLD and predicted_class > 0:
                    # Threat detected
                    threat_info = {
                        'timestamp': packet_data['timestamp'],
                        'threat_type': self.get_threat_type(predicted_class),
                        'confidence': float(max_prob),
                        'source_ip': self.extract_source_ip(packet_data['raw_packet']),
                        'destination_ip': self.extract_destination_ip(packet_data['raw_packet']),
                        'features': features,
                        'model_predictions': {
                            name: pred[0].tolist() for name, pred in individual_preds.items()
                        }
                    }
                    
                    self.threat_queue.put(threat_info)
                    self.alert_history.append(threat_info)
                    self.stats['threats_detected'] += 1
                    
        except Exception as e:
            print(f"Error analyzing packet: {e}")
    
    def get_threat_type(self, predicted_class):
        """Map predicted class to threat type"""
        threat_types = {
            0: 'Normal',
            1: 'DoS/DDoS',
            2: 'Probe/Scan',
            3: 'R2L',
            4: 'U2R'
        }
        return threat_types.get(predicted_class, 'Unknown')
    
    def extract_source_ip(self, packet):
        """Extract source IP from packet"""
        try:
            if IP in packet:
                return packet[IP].src
        except:
            pass
        return 'Unknown'
    
    def extract_destination_ip(self, packet):
        """Extract destination IP from packet"""
        try:
            if IP in packet:
                return packet[IP].dst
        except:
            pass
        return 'Unknown'
    
    def start_monitoring(self, interface=None):
        """Start real-time network monitoring"""
        if self.monitoring_active:
            return False
        
        self.monitoring_active = True
        interface = interface or self.config.NETWORK_INTERFACE
        
        def monitor_thread():
            try:
                print(f"Starting packet capture on interface: {interface}")
                sniff(
                    iface=interface,
                    prn=self.packet_handler,
                    stop_filter=lambda x: not self.monitoring_active,
                    timeout=self.config.PACKET_CAPTURE_TIMEOUT
                )
            except Exception as e:
                print(f"Error in monitoring thread: {e}")
                self.monitoring_active = False
        
        self.monitoring_thread = threading.Thread(target=monitor_thread)
        self.monitoring_thread.daemon = True
        self.monitoring_thread.start()
        
        return True
    
    def stop_monitoring(self):
        """Stop real-time network monitoring"""
        self.monitoring_active = False
        if self.monitoring_thread:
            self.monitoring_thread.join(timeout=5)
    
    def get_recent_threats(self, limit=50):
        """Get recent threat detections"""
        recent_threats = list(self.alert_history)[-limit:]
        return [
            {
                'timestamp': threat['timestamp'].isoformat(),
                'threat_type': threat['threat_type'],
                'confidence': threat['confidence'],
                'source_ip': threat['source_ip'],
                'destination_ip': threat['destination_ip']
            }
            for threat in recent_threats
        ]
    
    def get_system_stats(self):
        """Get current system statistics"""
        self.stats['system_load'] = psutil.cpu_percent()
        self.stats['memory_usage'] = psutil.virtual_memory().percent
        
        return self.stats.copy()
    
    def get_threat_summary(self):
        """Get threat detection summary"""
        if not self.alert_history:
            return {}
        
        threat_counts = {}
        for threat in self.alert_history:
            threat_type = threat['threat_type']
            threat_counts[threat_type] = threat_counts.get(threat_type, 0) + 1
        
        return threat_counts
