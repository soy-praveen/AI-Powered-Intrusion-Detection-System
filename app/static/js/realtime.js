// Real-time Communication Manager
class RealTimeManager {
    constructor() {
        this.socket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.heartbeatInterval = null;
        this.isConnected = false;
        
        this.init();
    }
    
    init() {
        this.connect();
        this.setupHeartbeat();
    }
    
    connect() {
        try {
            this.socket = io({
                transports: ['websocket', 'polling'],
                upgrade: true,
                rememberUpgrade: true,
                timeout: 5000,
                forceNew: false
            });
            
            this.setupEventListeners();
        } catch (error) {
            console.error('Failed to initialize socket connection:', error);
            this.handleReconnect();
        }
    }
    
    setupEventListeners() {
        this.socket.on('connect', () => {
            console.log('✅ Connected to server');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.updateConnectionStatus(true);
            this.showConnectionToast('Connected to server', 'success');
        });
        
        this.socket.on('disconnect', (reason) => {
            console.log('❌ Disconnected from server:', reason);
            this.isConnected = false;
            this.updateConnectionStatus(false);
            
            if (reason === 'io server disconnect') {
                // Server initiated disconnect, don't reconnect automatically
                this.showConnectionToast('Server disconnected', 'error');
            } else {
                // Client-side disconnect, attempt to reconnect
                this.showConnectionToast('Connection lost, attempting to reconnect...', 'warning');
                this.handleReconnect();
            }
        });
        
        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            this.isConnected = false;
            this.updateConnectionStatus(false);
            this.handleReconnect();
        });
        
        this.socket.on('reconnect', (attemptNumber) => {
            console.log(`✅ Reconnected after ${attemptNumber} attempts`);
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.updateConnectionStatus(true);
            this.showConnectionToast('Reconnected successfully', 'success');
        });
        
        this.socket.on('reconnect_attempt', (attemptNumber) => {
            console.log(`🔄 Reconnection attempt ${attemptNumber}`);
        });
        
        this.socket.on('reconnect_error', (error) => {
            console.error('Reconnection error:', error);
        });
        
        this.socket.on('reconnect_failed', () => {
            console.error('❌ Failed to reconnect after maximum attempts');
            this.showConnectionToast('Failed to reconnect to server', 'error');
        });
        
        // Custom event listeners
        this.socket.on('threat_detected', (data) => {
            this.handleThreatDetected(data);
        });
        
        this.socket.on('system_stats', (data) => {
            this.handleSystemStats(data);
        });
        
        this.socket.on('network_activity', (data) => {
            this.handleNetworkActivity(data);
        });
        
        this.socket.on('model_update', (data) => {
            this.handleModelUpdate(data);
        });
        
        this.socket.on('system_alert', (data) => {
            this.handleSystemAlert(data);
        });
        
        this.socket.on('heartbeat', () => {
            // Server heartbeat received
            this.lastHeartbeat = Date.now();
        });
    }
    
    setupHeartbeat() {
        // Send heartbeat every 30 seconds
        this.heartbeatInterval = setInterval(() => {
            if (this.isConnected && this.socket) {
                this.socket.emit('heartbeat', {
                    timestamp: Date.now(),
                    clientId: this.getClientId()
                });
            }
        }, 30000);
        
        // Check for missed heartbeats
        setInterval(() => {
            if (this.lastHeartbeat && Date.now() - this.lastHeartbeat > 60000) {
                console.warn('⚠️ No heartbeat received for 60 seconds');
                this.handleReconnect();
            }
        }, 10000);
    }
    
    getClientId() {
        let clientId = localStorage.getItem('clientId');
        if (!clientId) {
            clientId = 'client_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('clientId', clientId);
        }
        return clientId;
    }
    
    handleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('❌ Maximum reconnection attempts reached');
            return;
        }
        
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
        
        console.log(`🔄 Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
        
        setTimeout(() => {
            if (!this.isConnected) {
                this.connect();
            }
        }, delay);
    }
    
    updateConnectionStatus(connected) {
        const statusIndicator = document.querySelector('.status-dot');
        const statusText = document.querySelector('.status-text');
        
        if (statusIndicator) {
            statusIndicator.style.backgroundColor = connected ? 
                'var(--success-color)' : 'var(--danger-color)';
            
            if (connected) {
                statusIndicator.classList.add('animate-pulse');
            } else {
                statusIndicator.classList.remove('animate-pulse');
            }
        }
        
        if (statusText) {
            statusText.textContent = connected ? 'Connected' : 'Disconnected';
        }
        
        // Update page title to show connection status
        const originalTitle = document.title.replace(' - Disconnected', '');
        document.title = connected ? originalTitle : originalTitle + ' - Disconnected';
    }
    
    showConnectionToast(message, type) {
        if (window.dashboardManager && window.dashboardManager.showToast) {
            window.dashboardManager.showToast({
                type: type,
                title: 'Connection Status',
                message: message,
                duration: 3000
            });
        }
    }
    
    handleThreatDetected(data) {
        console.log('🚨 Threat detected:', data);
        
        // Update dashboard stats
        if (window.dashboardManager) {
            window.dashboardManager.handleThreatUpdate(data);
        }
        
        // Update charts
        if (window.chartsManager) {
            const timestamp = new Date(data.timestamp).toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            window.chartsManager.addThreatDataPoint(timestamp, 1);
        }
        
        // Play notification sound for high-severity threats
        if (data.confidence > 0.8) {
            this.playNotificationSound();
        }
        
        // Show browser notification if permission granted
        this.showBrowserNotification({
            title: `${data.threat_type} Detected`,
            body: `Confidence: ${(data.confidence * 100).toFixed(1)}% | Source: ${data.source_ip}`,
            icon: '/static/images/threat-icon.png',
            tag: 'threat-detection'
        });
    }
    
    handleSystemStats(data) {
        console.log('📊 System stats update:', data);
        
        if (window.dashboardManager) {
            window.dashboardManager.updateStats(data);
        }
        
        // Update mini charts
        if (window.chartsManager) {
            // Update performance indicators
            this.updatePerformanceIndicators(data);
        }
    }
    
    handleNetworkActivity(data) {
        console.log('🌐 Network activity update:', data);
        
        // Update network activity chart
        if (window.chartsManager && window.chartsManager.charts.networkActivity) {
            const chart = window.chartsManager.charts.networkActivity;
            
            // Add new data point
            chart.data.labels.push(new Date().toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
            }));
            chart.data.datasets[0].data.push(data.packets_per_second);
            chart.data.datasets[1].data.push(data.threats_per_second);
            
            // Keep only last 10 data points
            if (chart.data.labels.length > 10) {
                chart.data.labels.shift();
                chart.data.datasets[0].data.shift();
                chart.data.datasets[1].data.shift();
            }
            
            chart.update('active');
        }
    }
    
    handleModelUpdate(data) {
        console.log('🤖 Model update:', data);
        
        // Show notification about model performance changes
        if (window.dashboardManager) {
            window.dashboardManager.showToast({
                type: 'info',
                title: 'Model Updated',
                message: `${data.model_name} accuracy: ${(data.accuracy * 100).toFixed(1)}%`,
                duration: 5000
            });
        }
        
        // Update model performance display
        this.updateModelPerformance(data);
    }
    
    handleSystemAlert(data) {
        console.log('⚠️ System alert:', data);
        
        // Show system alert
        if (window.dashboardManager) {
            window.dashboardManager.showToast({
                type: data.severity || 'warning',
                title: data.title || 'System Alert',
                message: data.message,
                duration: data.duration || 5000
            });
            
            // Add to notifications
            window.dashboardManager.addNotification({
                type: 'system',
                title: data.title || 'System Alert',
                message: data.message,
                timestamp: new Date().toISOString(),
                severity: data.severity || 'warning'
            });
        }
    }
    
    updatePerformanceIndicators(data) {
        // Update CPU usage indicator
        const cpuIndicator = document.querySelector('[data-metric="cpu"] .progress-fill');
        if (cpuIndicator) {
            cpuIndicator.style.width = `${Math.min(data.cpu_usage || 0, 100)}%`;
            
            // Change color based on usage
            if (data.cpu_usage > 80) {
                cpuIndicator.style.background = 'var(--danger-color)';
            } else if (data.cpu_usage > 60) {
                cpuIndicator.style.background = 'var(--warning-color)';
            } else {
                cpuIndicator.style.background = 'var(--success-color)';
            }
        }
        
        // Update memory usage indicator
        const memoryIndicator = document.querySelector('[data-metric="memory"] .progress-fill');
        if (memoryIndicator) {
            memoryIndicator.style.width = `${Math.min(data.memory_usage || 0, 100)}%`;
            
            // Change color based on usage
            if (data.memory_usage > 85) {
                memoryIndicator.style.background = 'var(--danger-color)';
            } else if (data.memory_usage > 70) {
                memoryIndicator.style.background = 'var(--warning-color)';
            } else {
                memoryIndicator.style.background = 'var(--success-color)';
            }
        }
    }
    
    updateModelPerformance(data) {
        const modelElement = document.querySelector(`[data-model="${data.model_name}"]`);
        if (modelElement) {
            const accuracyElement = modelElement.querySelector('.accuracy-value');
            const precisionElement = modelElement.querySelector('.precision-value');
            const recallElement = modelElement.querySelector('.recall-value');
            
            if (accuracyElement) {
                accuracyElement.textContent = `${(data.accuracy * 100).toFixed(1)}%`;
            }
            if (precisionElement) {
                precisionElement.textContent = `${(data.precision * 100).toFixed(1)}%`;
            }
            if (recallElement) {
                recallElement.textContent = `${(data.recall * 100).toFixed(1)}%`;
            }
            
            // Add update animation
            modelElement.classList.add('model-updated');
            setTimeout(() => {
                modelElement.classList.remove('model-updated');
            }, 2000);
        }
    }
    
    playNotificationSound() {
        // Check if audio is enabled in settings
        const audioEnabled = localStorage.getItem('audioNotifications') !== 'false';
        if (!audioEnabled) return;
        
        try {
            const audio = new Audio('/static/sounds/threat-alert.mp3');
            audio.volume = 0.3;
            audio.play().catch(error => {
                console.log('Could not play notification sound:', error);
            });
        } catch (error) {
            console.log('Audio not supported:', error);
        }
    }
    
    async showBrowserNotification(options) {
        // Check if notifications are supported and permitted
        if (!('Notification' in window)) {
            return;
        }
        
        let permission = Notification.permission;
        
        if (permission === 'default') {
            permission = await Notification.requestPermission();
        }
        
        if (permission === 'granted') {
            const notification = new Notification(options.title, {
                body: options.body,
                icon: options.icon,
                tag: options.tag,
                requireInteraction: true,
                silent: false
            });
            
            notification.onclick = () => {
                window.focus();
                notification.close();
            };
            
            // Auto-close after 10 seconds
            setTimeout(() => {
                notification.close();
            }, 10000);
        }
    }
    
    // Public methods for sending data to server
    sendMessage(event, data) {
        if (this.isConnected && this.socket) {
            this.socket.emit(event, data);
        } else {
            console.warn('Cannot send message: not connected to server');
        }
    }
    
    requestThreatAnalysis(data) {
        this.sendMessage('analyze_threat', data);
    }
    
    requestSystemStats() {
        this.sendMessage('request_stats', {});
    }
    
    updateSettings(settings) {
        this.sendMessage('update_settings', settings);
    }
    
    destroy() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}

// Initialize real-time manager
document.addEventListener('DOMContentLoaded', () => {
    window.realTimeManager = new RealTimeManager();
});

// Add CSS for model update animation
const modelUpdateStyles = document.createElement('style');
modelUpdateStyles.textContent = `
    .model-updated {
        animation: modelUpdate 2s ease-in-out;
    }
    
    @keyframes modelUpdate {
        0% { transform: scale(1); }
        50% { transform: scale(1.02); box-shadow: 0 0 20px rgba(99, 102, 241, 0.3); }
        100% { transform: scale(1); }
    }
`;
document.head.appendChild(modelUpdateStyles);
