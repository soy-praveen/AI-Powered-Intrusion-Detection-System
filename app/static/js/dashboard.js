// Dashboard Core JavaScript
class DashboardManager {
    constructor() {
        this.socket = null;
        this.charts = {};
        this.theme = localStorage.getItem('theme') || 'light';
        this.sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
        this.monitoringActive = false;
        this.notifications = [];
        
        this.init();
    }
    
    init() {
        this.initializeSocket();
        this.setupEventListeners();
        this.initializeTheme();
        this.initializeSidebar();
        this.startDataRefresh();
        this.initializeAnimations();
    }
    
    initializeSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.updateConnectionStatus(true);
        });
        
        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.updateConnectionStatus(false);
        });
        
        this.socket.on('threat_update', (data) => {
            this.handleThreatUpdate(data);
        });
        
        this.socket.on('stats_update', (data) => {
            this.updateStats(data);
        });
        
        this.socket.on('system_alert', (data) => {
            this.showNotification(data);
        });
    }
    
    setupEventListeners() {
        // Sidebar toggle
        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        }
        
        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }
        
        // Monitoring controls
        const startMonitoring = document.getElementById('startMonitoring');
        const stopMonitoring = document.getElementById('stopMonitoring');
        
        if (startMonitoring) {
            startMonitoring.addEventListener('click', () => this.startMonitoring());
        }
        
        if (stopMonitoring) {
            stopMonitoring.addEventListener('click', () => this.stopMonitoring());
        }
        
        // Notification panel
        const notificationBtn = document.getElementById('notificationBtn');
        const closeNotifications = document.getElementById('closeNotifications');
        
        if (notificationBtn) {
            notificationBtn.addEventListener('click', () => this.toggleNotificationPanel());
        }
        
        if (closeNotifications) {
            closeNotifications.addEventListener('click', () => this.closeNotificationPanel());
        }
        
        // Refresh threats
        const refreshThreats = document.getElementById('refreshThreats');
        if (refreshThreats) {
            refreshThreats.addEventListener('click', () => this.refreshThreats());
        }
        
        // Time range selector
        const timeRangeSelect = document.getElementById('timeRangeSelect');
        if (timeRangeSelect) {
            timeRangeSelect.addEventListener('change', (e) => {
                this.updateTimeRange(e.target.value);
            });
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
        
        // Window resize
        window.addEventListener('resize', () => this.handleResize());
        
        // Smooth scrolling for internal links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }
    
    initializeTheme() {
        document.documentElement.setAttribute('data-theme', this.theme);
        const themeIcon = document.querySelector('#themeToggle i');
        if (themeIcon) {
            themeIcon.className = this.theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
        
        // Smooth theme transition
        document.documentElement.style.transition = 'background-color 0.3s ease, color 0.3s ease';
        setTimeout(() => {
            document.documentElement.style.transition = '';
        }, 300);
    }
    
    toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', this.theme);
        
        // Add transition class for smooth animation
        document.body.classList.add('theme-transitioning');
        
        this.initializeTheme();
        
        // Remove transition class after animation
        setTimeout(() => {
            document.body.classList.remove('theme-transitioning');
        }, 300);
        
        // Update charts for new theme
        setTimeout(() => {
            Object.values(this.charts).forEach(chart => {
                if (chart && chart.update) {
                    chart.update();
                }
            });
        }, 100);
    }
    
    initializeSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar && this.sidebarCollapsed) {
            sidebar.classList.add('collapsed');
        }
    }
    
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            this.sidebarCollapsed = !this.sidebarCollapsed;
            sidebar.classList.toggle('collapsed');
            localStorage.setItem('sidebarCollapsed', this.sidebarCollapsed);
            
            // Animate sidebar toggle
            sidebar.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            
            // Update charts after sidebar animation
            setTimeout(() => {
                Object.values(this.charts).forEach(chart => {
                    if (chart && chart.resize) {
                        chart.resize();
                    }
                });
            }, 300);
        }
    }
    
    initializeAnimations() {
        // Stagger animation for stat cards
        const statCards = document.querySelectorAll('.stat-card');
        statCards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                card.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
        });
        
        // Animate chart cards
        const chartCards = document.querySelectorAll('.chart-card, .activity-card');
        chartCards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px)';
            
            setTimeout(() => {
                card.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, (statCards.length * 100) + (index * 150));
        });
        
        // Add hover effects to interactive elements
        this.addHoverEffects();
    }
    
    addHoverEffects() {
        // Add ripple effect to buttons
        document.querySelectorAll('.control-btn, .theme-btn, .notification-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                const ripple = document.createElement('span');
                const rect = this.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                const x = e.clientX - rect.left - size / 2;
                const y = e.clientY - rect.top - size / 2;
                
                ripple.style.cssText = `
                    position: absolute;
                    width: ${size}px;
                    height: ${size}px;
                    left: ${x}px;
                    top: ${y}px;
                    background: rgba(255, 255, 255, 0.3);
                    border-radius: 50%;
                    transform: scale(0);
                    animation: ripple 0.6s ease-out;
                    pointer-events: none;
                `;
                
                this.style.position = 'relative';
                this.style.overflow = 'hidden';
                this.appendChild(ripple);
                
                setTimeout(() => {
                    ripple.remove();
                }, 600);
            });
        });
    }
    
    async startMonitoring() {
        try {
            this.showLoading('Starting network monitoring...');
            
            const response = await fetch('/api/start-monitoring', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                this.monitoringActive = true;
                this.updateMonitoringStatus(true);
                this.showSuccessMessage('Network monitoring started successfully');
            } else {
                this.showErrorMessage(data.message || 'Failed to start monitoring');
            }
        } catch (error) {
            console.error('Error starting monitoring:', error);
            this.showErrorMessage('Failed to start monitoring');
        } finally {
            this.hideLoading();
        }
    }
    
    async stopMonitoring() {
        try {
            this.showLoading('Stopping network monitoring...');
            
            const response = await fetch('/api/stop-monitoring', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                this.monitoringActive = false;
                this.updateMonitoringStatus(false);
                this.showSuccessMessage('Network monitoring stopped');
            } else {
                this.showErrorMessage(data.message || 'Failed to stop monitoring');
            }
        } catch (error) {
            console.error('Error stopping monitoring:', error);
            this.showErrorMessage('Failed to stop monitoring');
        } finally {
            this.hideLoading();
        }
    }
    
    updateMonitoringStatus(active) {
        const statusIndicator = document.getElementById('monitoringStatus');
        const startBtn = document.getElementById('startMonitoring');
        const stopBtn = document.getElementById('stopMonitoring');
        
        if (statusIndicator) {
            const dot = statusIndicator.querySelector('.status-dot');
            const text = statusIndicator.querySelector('.status-text');
            
            if (active) {
                dot.style.backgroundColor = 'var(--success-color)';
                text.textContent = 'Monitoring Active';
                statusIndicator.classList.add('animate-pulse');
            } else {
                dot.style.backgroundColor = 'var(--danger-color)';
                text.textContent = 'Monitoring Stopped';
                statusIndicator.classList.remove('animate-pulse');
            }
        }
        
        if (startBtn && stopBtn) {
            if (active) {
                startBtn.style.display = 'none';
                stopBtn.style.display = 'flex';
            } else {
                startBtn.style.display = 'flex';
                stopBtn.style.display = 'none';
            }
        }
    }
    
    updateConnectionStatus(connected) {
        const statusDot = document.querySelector('.status-dot');
        if (statusDot) {
            statusDot.style.backgroundColor = connected ? 'var(--success-color)' : 'var(--danger-color)';
        }
    }
    
    async refreshThreats() {
        try {
            const refreshBtn = document.getElementById('refreshThreats');
            if (refreshBtn) {
                refreshBtn.classList.add('animate-spin');
            }
            
            const response = await fetch('/api/threats/recent?limit=10');
            const data = await response.json();
            
            if (data.threats) {
                this.updateThreatsList(data.threats);
            }
        } catch (error) {
            console.error('Error refreshing threats:', error);
            this.showErrorMessage('Failed to refresh threats');
        } finally {
            const refreshBtn = document.getElementById('refreshThreats');
            if (refreshBtn) {
                refreshBtn.classList.remove('animate-spin');
            }
        }
    }
    
    updateThreatsList(threats) {
        const threatsList = document.getElementById('threatsList');
        if (!threatsList) return;
        
        if (threats.length === 0) {
            threatsList.innerHTML = `
                <div class="no-threats">
                    <i class="fas fa-shield-alt" style="font-size: 2rem; color: var(--success-color); margin-bottom: 1rem;"></i>
                    <p>No recent threats detected</p>
                </div>
            `;
            return;
        }
        
        threatsList.innerHTML = threats.map(threat => `
            <div class="threat-item animate-slide-in-left">
                <div class="threat-icon ${this.getThreatSeverity(threat.confidence)}">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <div class="threat-details">
                    <div class="threat-type">${threat.threat_type}</div>
                    <div class="threat-source">From: ${threat.source_ip}</div>
                </div>
                <div class="threat-time">${this.formatTime(threat.timestamp)}</div>
            </div>
        `).join('');
    }
    
    getThreatSeverity(confidence) {
        if (confidence > 0.8) return 'high';
        if (confidence > 0.6) return 'medium';
        return 'low';
    }
    
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return date.toLocaleDateString();
    }
    
    handleThreatUpdate(data) {
        // Update notification badge
        this.addNotification({
            type: 'threat',
            title: `New ${data.threat_type} Detected`,
            message: `Confidence: ${(data.confidence * 100).toFixed(1)}%`,
            timestamp: new Date().toISOString(),
            severity: this.getThreatSeverity(data.confidence)
        });
        
        // Update stats
        this.incrementThreatCount();
        
        // Refresh threats list
        this.refreshThreats();
        
        // Show toast notification for high-severity threats
        if (data.confidence > 0.8) {
            this.showToast({
                type: 'warning',
                title: 'High-Risk Threat Detected',
                message: `${data.threat_type} with ${(data.confidence * 100).toFixed(1)}% confidence`,
                duration: 5000
            });
        }
    }
    
    addNotification(notification) {
        this.notifications.unshift(notification);
        
        // Keep only last 50 notifications
        if (this.notifications.length > 50) {
            this.notifications = this.notifications.slice(0, 50);
        }
        
        this.updateNotificationBadge();
        this.updateNotificationPanel();
    }
    
    updateNotificationBadge() {
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            const unreadCount = this.notifications.filter(n => !n.read).length;
            badge.textContent = unreadCount;
            badge.style.display = unreadCount > 0 ? 'block' : 'none';
            
            if (unreadCount > 0) {
                badge.classList.add('animate-bounce');
                setTimeout(() => badge.classList.remove('animate-bounce'), 1000);
            }
        }
    }
    
    toggleNotificationPanel() {
        const panel = document.getElementById('notificationPanel');
        if (panel) {
            panel.classList.toggle('open');
            
            if (panel.classList.contains('open')) {
                // Mark all notifications as read
                this.notifications.forEach(n => n.read = true);
                this.updateNotificationBadge();
            }
        }
    }
    
    closeNotificationPanel() {
        const panel = document.getElementById('notificationPanel');
        if (panel) {
            panel.classList.remove('open');
        }
    }
    
    updateNotificationPanel() {
        const notificationList = document.getElementById('notificationList');
        if (!notificationList) return;
        
        if (this.notifications.length === 0) {
            notificationList.innerHTML = `
                <div class="no-notifications">
                    <i class="fas fa-bell-slash" style="font-size: 2rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                    <p>No notifications</p>
                </div>
            `;
            return;
        }
        
        notificationList.innerHTML = this.notifications.map(notification => `
            <div class="notification-item ${notification.severity || 'info'}">
                <div class="notification-icon">
                    <i class="fas ${this.getNotificationIcon(notification.type)}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-title">${notification.title}</div>
                    <div class="notification-message">${notification.message}</div>
                    <div class="notification-time">${this.formatTime(notification.timestamp)}</div>
                </div>
            </div>
        `).join('');
    }
    
    getNotificationIcon(type) {
        const icons = {
            threat: 'fa-exclamation-triangle',
            system: 'fa-cog',
            success: 'fa-check-circle',
            warning: 'fa-exclamation-circle',
            error: 'fa-times-circle',
            info: 'fa-info-circle'
        };
        return icons[type] || 'fa-bell';
    }
    
    async updateStats(data) {
        // Animate stat numbers
        this.animateStatNumber('threatsDetected', data.threats_detected || 0);
        this.animateStatNumber('packetsAnalyzed', data.packets_analyzed || 0);
        this.animateStatNumber('systemLoad', `${data.system_load || 0}%`);
        
        // Update progress bars
        this.updateProgressBar('bandwidth', data.bandwidth_usage || 0);
        this.updateProgressBar('connections', data.active_connections || 0);
        this.updateProgressBar('suspicious', data.suspicious_activity || 0);
    }
    
    animateStatNumber(elementId, targetValue) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const currentValue = parseInt(element.textContent) || 0;
        const target = typeof targetValue === 'string' ? 
            parseInt(targetValue.replace('%', '')) : targetValue;
        
        const duration = 1000;
        const steps = 30;
        const increment = (target - currentValue) / steps;
        let current = currentValue;
        let step = 0;
        
        const animate = () => {
            if (step < steps) {
                current += increment;
                element.textContent = typeof targetValue === 'string' && targetValue.includes('%') ?
                    `${Math.round(current)}%` : Math.round(current);
                step++;
                setTimeout(animate, duration / steps);
            } else {
                element.textContent = targetValue;
            }
        };
        
        animate();
    }
    
    updateProgressBar(type, value) {
        const progressBar = document.querySelector(`[data-progress="${type}"] .progress-fill`);
        if (progressBar) {
            progressBar.style.width = `${Math.min(value, 100)}%`;
        }
    }
    
    incrementThreatCount() {
        const element = document.getElementById('threatsDetected');
        if (element) {
            const current = parseInt(element.textContent) || 0;
            this.animateStatNumber('threatsDetected', current + 1);
        }
    }
    
    startDataRefresh() {
        // Refresh stats every 5 seconds
        setInterval(async () => {
            try {
                const response = await fetch('/api/stats');
                const data = await response.json();
                this.updateStats(data.system_stats);
            } catch (error) {
                console.error('Error fetching stats:', error);
            }
        }, 5000);
        
        // Refresh threats every 10 seconds
        setInterval(() => {
            this.refreshThreats();
        }, 10000);
    }
    
    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + Shift + T: Toggle theme
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
            e.preventDefault();
            this.toggleTheme();
        }
        
        // Ctrl/Cmd + Shift + S: Toggle sidebar
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
            e.preventDefault();
            this.toggleSidebar();
        }
        
        // Ctrl/Cmd + Shift + N: Toggle notifications
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'N') {
            e.preventDefault();
            this.toggleNotificationPanel();
        }
        
        // Escape: Close notification panel
        if (e.key === 'Escape') {
            this.closeNotificationPanel();
        }
    }
    
    handleResize() {
        // Debounce resize events
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            Object.values(this.charts).forEach(chart => {
                if (chart && chart.resize) {
                    chart.resize();
                }
            });
        }, 250);
    }
    
    showLoading(message = 'Loading...') {
        const overlay = document.getElementById('loadingOverlay');
        const text = overlay?.querySelector('.loading-text');
        
        if (overlay) {
            if (text) text.textContent = message;
            overlay.classList.add('show');
        }
    }
    
    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.remove('show');
        }
    }
    
    showToast({ type = 'info', title, message, duration = 3000 }) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type} animate-slide-in-right`;
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas ${this.getNotificationIcon(type)}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add toast styles if not already present
        if (!document.querySelector('#toast-styles')) {
            const styles = document.createElement('style');
            styles.id = 'toast-styles';
            styles.textContent = `
                .toast {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: var(--bg-primary);
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius);
                    padding: 1rem;
                    box-shadow: var(--shadow-lg);
                    z-index: 4000;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    min-width: 300px;
                    max-width: 400px;
                }
                .toast-info { border-left: 4px solid var(--info-color); }
                .toast-success { border-left: 4px solid var(--success-color); }
                .toast-warning { border-left: 4px solid var(--warning-color); }
                .toast-error { border-left: 4px solid var(--danger-color); }
                .toast-icon { font-size: 1.25rem; }
                .toast-content { flex: 1; }
                .toast-title { font-weight: 600; margin-bottom: 0.25rem; }
                .toast-message { font-size: 0.875rem; color: var(--text-secondary); }
                .toast-close { background: none; border: none; color: var(--text-muted); cursor: pointer; }
            `;
            document.head.appendChild(styles);
        }
        
        document.body.appendChild(toast);
        
        // Close button functionality
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.classList.add('animate-slide-out-right');
            setTimeout(() => toast.remove(), 300);
        });
        
        // Auto remove
        setTimeout(() => {
            if (toast.parentNode) {
                toast.classList.add('animate-slide-out-right');
                setTimeout(() => toast.remove(), 300);
            }
        }, duration);
    }
    
    showSuccessMessage(message) {
        this.showToast({
            type: 'success',
            title: 'Success',
            message: message
        });
    }
    
    showErrorMessage(message) {
        this.showToast({
            type: 'error',
            title: 'Error',
            message: message
        });
    }
    
    updateTimeRange(range) {
        // Update charts based on time range
        Object.values(this.charts).forEach(chart => {
            if (chart && chart.updateTimeRange) {
                chart.updateTimeRange(range);
            }
        });
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboardManager = new DashboardManager();
});

// Add CSS animations keyframes
const animationStyles = document.createElement('style');
animationStyles.textContent = `
    @keyframes ripple {
        to {
            transform: scale(2);
            opacity: 0;
        }
    }
    
    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
    
    .theme-transitioning * {
        transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease !important;
    }
`;
document.head.appendChild(animationStyles);
