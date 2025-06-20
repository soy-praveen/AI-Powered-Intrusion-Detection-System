// Advanced Charts Manager
class ChartsManager {
    constructor() {
        this.charts = {};
        this.chartColors = {
            primary: 'rgb(99, 102, 241)',
            primaryLight: 'rgba(99, 102, 241, 0.1)',
            success: 'rgb(16, 185, 129)',
            successLight: 'rgba(16, 185, 129, 0.1)',
            warning: 'rgb(245, 158, 11)',
            warningLight: 'rgba(245, 158, 11, 0.1)',
            danger: 'rgb(239, 68, 68)',
            dangerLight: 'rgba(239, 68, 68, 0.1)',
            info: 'rgb(59, 130, 246)',
            infoLight: 'rgba(59, 130, 246, 0.1)'
        };
        
        this.init();
    }
    
    init() {
        this.setupChartDefaults();
        this.initializeCharts();
        this.setupResponsiveHandlers();
    }
    
    setupChartDefaults() {
        Chart.defaults.font.family = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        Chart.defaults.font.size = 12;
        Chart.defaults.color = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim();
        Chart.defaults.borderColor = getComputedStyle(document.documentElement).getPropertyValue('--border-light').trim();
        Chart.defaults.backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--bg-secondary').trim();
        
        // Animation defaults
        Chart.defaults.animation.duration = 1000;
        Chart.defaults.animation.easing = 'easeInOutCubic';
        Chart.defaults.elements.point.hoverRadius = 8;
        Chart.defaults.elements.point.radius = 4;
        Chart.defaults.elements.line.tension = 0.4;
    }
    
    initializeCharts() {
        this.initThreatTimelineChart();
        this.initAttackTypesChart();
        this.initNetworkActivityChart();
        this.initStatCharts();
        this.initPerformanceCharts();
    }
    
    initThreatTimelineChart() {
        const ctx = document.getElementById('threatTimelineChart');
        if (!ctx) return;
        
        // Generate sample data
        const data = this.generateTimelineData();
        
        this.charts.threatTimeline = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Threats Detected',
                    data: data.values,
                    borderColor: this.chartColors.danger,
                    backgroundColor: this.chartColors.dangerLight,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: this.chartColors.danger,
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: this.chartColors.danger,
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            title: (context) => {
                                return `Time: ${context[0].label}`;
                            },
                            label: (context) => {
                                return `Threats: ${context.parsed.y}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            maxTicksLimit: 8
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: getComputedStyle(document.documentElement).getPropertyValue('--border-light').trim()
                        },
                        ticks: {
                            precision: 0
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                animation: {
                    onComplete: () => {
                        // Add glow effect after animation
                        ctx.style.filter = 'drop-shadow(0 0 10px rgba(239, 68, 68, 0.3))';
                    }
                }
            }
        });
    }
    
    initAttackTypesChart() {
        const ctx = document.getElementById('attackTypesChart');
        if (!ctx) return;
        
        const data = [
            { label: 'DoS/DDoS', value: 45, color: this.chartColors.danger },
            { label: 'Probe/Scan', value: 30, color: this.chartColors.warning },
            { label: 'R2L', value: 15, color: this.chartColors.info },
            { label: 'U2R', value: 10, color: this.chartColors.success }
        ];
        
        this.charts.attackTypes = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.map(d => d.label),
                datasets: [{
                    data: data.map(d => d.value),
                    backgroundColor: data.map(d => d.color),
                    borderColor: '#ffffff',
                    borderWidth: 3,
                    hoverBorderWidth: 5,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            font: {
                                size: 12,
                                weight: '500'
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        cornerRadius: 8,
                        callbacks: {
                            label: (context) => {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                return `${context.label}: ${context.parsed} (${percentage}%)`;
                            }
                        }
                    }
                },
                animation: {
                    animateRotate: true,
                    animateScale: true,
                    duration: 1500,
                    easing: 'easeInOutCubic'
                }
            }
        });
    }
    
    initNetworkActivityChart() {
        const ctx = document.getElementById('networkActivityChart');
        if (!ctx) return;
        
        const data = this.generateNetworkData();
        
        this.charts.networkActivity = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Packets/sec',
                    data: data.packets,
                    backgroundColor: this.chartColors.primaryLight,
                    borderColor: this.chartColors.primary,
                    borderWidth: 2,
                    borderRadius: 4,
                    borderSkipped: false
                }, {
                    label: 'Threats/sec',
                    data: data.threats,
                    backgroundColor: this.chartColors.dangerLight,
                    borderColor: this.chartColors.danger,
                    borderWidth: 2,
                    borderRadius: 4,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        align: 'end',
                        labels: {
                            usePointStyle: true,
                            pointStyle: 'rect',
                            padding: 15
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        cornerRadius: 8
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: getComputedStyle(document.documentElement).getPropertyValue('--border-light').trim()
                        }
                    }
                },
                animation: {
                    delay: (context) => {
                        return context.dataIndex * 100;
                    }
                }
            }
        });
    }
    
    initStatCharts() {
        // Mini charts for stat cards
        this.initMiniChart('threatsChart', this.generateMiniData(), this.chartColors.danger);
        this.initMiniChart('packetsChart', this.generateMiniData(), this.chartColors.info);
        this.initMiniChart('performanceChart', this.generateMiniData(), this.chartColors.warning);
        this.initMiniChart('accuracyChart', this.generateMiniData(), this.chartColors.success);
    }
    
    initMiniChart(canvasId, data, color) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        
        this.charts[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.values,
                    borderColor: color,
                    backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.1)'),
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                },
                scales: {
                    x: { display: false },
                    y: { display: false }
                },
                elements: {
                    point: { radius: 0 }
                },
                animation: {
                    duration: 2000,
                    easing: 'easeInOutCubic'
                }
            }
        });
    }
    
    initPerformanceCharts() {
        // Additional performance visualization charts can be added here
        // For example: confusion matrix heatmap, ROC curves, etc.
    }
    
    generateTimelineData() {
        const labels = [];
        const values = [];
        const now = new Date();
        
        for (let i = 23; i >= 0; i--) {
            const time = new Date(now.getTime() - i * 60 * 60 * 1000);
            labels.push(time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
            values.push(Math.floor(Math.random() * 20) + Math.sin(i * 0.5) * 5 + 10);
        }
        
        return { labels, values };
    }
    
    generateNetworkData() {
        const labels = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];
        const packets = [1200, 1900, 3000, 5000, 4200, 2800];
        const threats = [2, 5, 12, 18, 15, 8];
        
        return { labels, packets, threats };
    }
    
    generateMiniData() {
        const labels = Array.from({ length: 12 }, (_, i) => i);
        const values = Array.from({ length: 12 }, () => Math.floor(Math.random() * 100));
        
        return { labels, values };
    }
    
    updateTimeRange(range) {
        // Update charts based on selected time range
        if (this.charts.threatTimeline) {
            const data = this.generateTimelineData(range);
            this.charts.threatTimeline.data.labels = data.labels;
            this.charts.threatTimeline.data.datasets[0].data = data.values;
            this.charts.threatTimeline.update('active');
        }
    }
    
    updateChartTheme() {
        // Update chart colors for theme changes
        const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim();
        const borderColor = getComputedStyle(document.documentElement).getPropertyValue('--border-light').trim();
        
        Object.values(this.charts).forEach(chart => {
            if (chart && chart.options) {
                // Update text colors
                Chart.defaults.color = textColor;
                
                // Update grid colors
                if (chart.options.scales) {
                    Object.values(chart.options.scales).forEach(scale => {
                        if (scale.grid) {
                            scale.grid.color = borderColor;
                        }
                    });
                }
                
                chart.update('none');
            }
        });
    }
    
    setupResponsiveHandlers() {
        // Handle window resize
        window.addEventListener('resize', this.debounce(() => {
            Object.values(this.charts).forEach(chart => {
                if (chart && chart.resize) {
                    chart.resize();
                }
            });
        }, 250));
        
        // Handle theme changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
                    setTimeout(() => this.updateChartTheme(), 100);
                }
            });
        });
        
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme']
        });
    }
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // Real-time data update methods
    addThreatDataPoint(timestamp, value) {
        const chart = this.charts.threatTimeline;
        if (!chart) return;
        
        chart.data.labels.push(timestamp);
        chart.data.datasets[0].data.push(value);
        
        // Keep only last 24 data points
        if (chart.data.labels.length > 24) {
            chart.data.labels.shift();
            chart.data.datasets[0].data.shift();
        }
        
        chart.update('active');
    }
    
    updateAttackTypeDistribution(data) {
        const chart = this.charts.attackTypes;
        if (!chart) return;
        
        chart.data.datasets[0].data = data;
        chart.update('active');
    }
    
    destroy() {
        Object.values(this.charts).forEach(chart => {
            if (chart && chart.destroy) {
                chart.destroy();
            }
        });
        this.charts = {};
    }
}

// Initialize charts when dashboard is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for dashboard manager to initialize
    setTimeout(() => {
        window.chartsManager = new ChartsManager();
        
        // Make charts available to dashboard manager
        if (window.dashboardManager) {
            window.dashboardManager.charts = window.chartsManager.charts;
        }
    }, 100);
});
