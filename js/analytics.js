// 🧠 Psychology Website - Analytics & Performance Monitoring
// Comprehensive tracking for user behavior and website performance

class PsychologyAnalytics {
    constructor() {
        this.startTime = performance.now();
        this.sessionId = this.generateSessionId();
        this.events = [];
        this.performanceMetrics = {};
        
        this.init();
    }

    init() {
        this.trackPageLoad();
        this.trackUserInteractions();
        this.trackPerformance();
        this.trackScrollDepth();
        this.trackFormInteractions();
        this.trackConsultationBookings();
        
        // Send analytics every 30 seconds
        setInterval(() => this.sendAnalytics(), 30000);
        
        // Send final analytics on page unload
        window.addEventListener('beforeunload', () => this.sendAnalytics());
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    trackEvent(eventName, properties = {}) {
        const event = {
            name: eventName,
            timestamp: Date.now(),
            sessionId: this.sessionId,
            url: window.location.href,
            userAgent: navigator.userAgent,
            ...properties
        };
        
        this.events.push(event);
        console.log('📊 Analytics Event:', event);
    }

    trackPageLoad() {
        window.addEventListener('load', () => {
            const loadTime = performance.now() - this.startTime;
            
            this.trackEvent('page_load', {
                loadTime: Math.round(loadTime),
                pageTitle: document.title,
                referrer: document.referrer,
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                }
            });

            // Track Core Web Vitals
            this.trackCoreWebVitals();
        });
    }

    trackCoreWebVitals() {
        // Largest Contentful Paint (LCP)
        new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            const lastEntry = entries[entries.length - 1];
            
            this.trackEvent('core_web_vitals', {
                metric: 'LCP',
                value: Math.round(lastEntry.startTime),
                rating: lastEntry.startTime < 2500 ? 'good' : lastEntry.startTime < 4000 ? 'needs_improvement' : 'poor'
            });
        }).observe({entryTypes: ['largest-contentful-paint']});

        // First Input Delay (FID)
        new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            entries.forEach(entry => {
                this.trackEvent('core_web_vitals', {
                    metric: 'FID',
                    value: Math.round(entry.processingStart - entry.startTime),
                    rating: entry.processingStart - entry.startTime < 100 ? 'good' : 
                           entry.processingStart - entry.startTime < 300 ? 'needs_improvement' : 'poor'
                });
            });
        }).observe({entryTypes: ['first-input']});

        // Cumulative Layout Shift (CLS)
        let clsValue = 0;
        new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            entries.forEach(entry => {
                if (!entry.hadRecentInput) {
                    clsValue += entry.value;
                }
            });
            
            this.trackEvent('core_web_vitals', {
                metric: 'CLS',
                value: Math.round(clsValue * 1000) / 1000,
                rating: clsValue < 0.1 ? 'good' : clsValue < 0.25 ? 'needs_improvement' : 'poor'
            });
        }).observe({entryTypes: ['layout-shift']});
    }

    trackUserInteractions() {
        // Button clicks
        document.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.classList.contains('btn')) {
                this.trackEvent('button_click', {
                    buttonText: e.target.textContent.trim(),
                    buttonClass: e.target.className,
                    elementId: e.target.id
                });
            }
        });

        // Link clicks
        document.addEventListener('click', (e) => {
            if (e.target.tagName === 'A') {
                this.trackEvent('link_click', {
                    linkText: e.target.textContent.trim(),
                    linkHref: e.target.href,
                    isExternal: !e.target.href.includes(window.location.hostname)
                });
            }
        });

        // Navigation clicks
        document.querySelectorAll('nav a, .nav a').forEach(link => {
            link.addEventListener('click', () => {
                this.trackEvent('navigation_click', {
                    section: link.textContent.trim(),
                    href: link.href
                });
            });
        });
    }

    trackScrollDepth() {
        let maxScroll = 0;
        const milestones = [25, 50, 75, 90, 100];
        const tracked = new Set();

        window.addEventListener('scroll', () => {
            const scrollPercent = Math.round(
                (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
            );
            
            maxScroll = Math.max(maxScroll, scrollPercent);

            milestones.forEach(milestone => {
                if (scrollPercent >= milestone && !tracked.has(milestone)) {
                    tracked.add(milestone);
                    this.trackEvent('scroll_depth', {
                        percentage: milestone,
                        timeOnPage: Date.now() - this.startTime
                    });
                }
            });
        });
    }

    trackFormInteractions() {
        // Track form starts
        document.querySelectorAll('input, textarea, select').forEach(field => {
            field.addEventListener('focus', () => {
                const form = field.closest('form');
                const formName = form?.id || form?.className || 'unknown_form';
                
                this.trackEvent('form_start', {
                    formName: formName,
                    fieldName: field.name || field.id,
                    fieldType: field.type || field.tagName.toLowerCase()
                });
            });
        });

        // Track form submissions
        document.querySelectorAll('form').forEach(form => {
            form.addEventListener('submit', (e) => {
                const formName = form.id || form.className || 'unknown_form';
                
                this.trackEvent('form_submit', {
                    formName: formName,
                    formAction: form.action,
                    fieldCount: form.querySelectorAll('input, textarea, select').length
                });
            });
        });
    }

    trackConsultationBookings() {
        // Track consultation modal opens
        const consultationButtons = document.querySelectorAll('[data-modal="consultation"], .consultation-btn');
        consultationButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.trackEvent('consultation_modal_open', {
                    source: btn.textContent.trim(),
                    location: this.getElementLocation(btn)
                });
            });
        });

        // Track newsletter signups
        const newsletterForms = document.querySelectorAll('.newsletter form, #newsletterForm');
        newsletterForms.forEach(form => {
            form.addEventListener('submit', () => {
                this.trackEvent('newsletter_signup', {
                    location: 'newsletter_section'
                });
            });
        });
    }

    trackPerformance() {
        // Track resource loading times
        window.addEventListener('load', () => {
            const resources = performance.getEntriesByType('resource');
            
            resources.forEach(resource => {
                if (resource.duration > 1000) { // Only track slow resources
                    this.trackEvent('slow_resource', {
                        name: resource.name,
                        duration: Math.round(resource.duration),
                        type: resource.initiatorType,
                        size: resource.transferSize
                    });
                }
            });

            // Overall performance summary
            const navigation = performance.getEntriesByType('navigation')[0];
            this.trackEvent('performance_summary', {
                domContentLoaded: Math.round(navigation.domContentLoadedEventEnd),
                loadComplete: Math.round(navigation.loadEventEnd),
                firstPaint: Math.round(performance.getEntriesByType('paint')[0]?.startTime || 0),
                resourceCount: resources.length
            });
        });
    }

    trackError(error) {
        this.trackEvent('javascript_error', {
            message: error.message,
            filename: error.filename,
            lineNumber: error.lineno,
            columnNumber: error.colno,
            stack: error.error?.stack
        });
    }

    getElementLocation(element) {
        const rect = element.getBoundingClientRect();
        return {
            x: Math.round(rect.left),
            y: Math.round(rect.top),
            section: this.getElementSection(element)
        };
    }

    getElementSection(element) {
        const sections = ['hero', 'about', 'services', 'contact', 'newsletter', 'footer'];
        
        for (const section of sections) {
            const sectionElement = document.querySelector(`.${section}, #${section}`);
            if (sectionElement && sectionElement.contains(element)) {
                return section;
            }
        }
        
        return 'unknown';
    }

    sendAnalytics() {
        if (this.events.length === 0) return;

        const payload = {
            sessionId: this.sessionId,
            timestamp: Date.now(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            events: [...this.events],
            performanceMetrics: this.performanceMetrics
        };

        // In a real implementation, send to your analytics service
        console.log('📊 Sending Analytics Batch:', payload);
        
        // Simulate sending to analytics service
        if (navigator.sendBeacon) {
            // Use sendBeacon for reliable delivery
            const blob = new Blob([JSON.stringify(payload)], {type: 'application/json'});
            navigator.sendBeacon('/analytics', blob);
        } else {
            // Fallback to fetch
            fetch('/analytics', {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: {
                    'Content-Type': 'application/json'
                }
            }).catch(err => console.log('Analytics send failed:', err));
        }

        // Clear sent events
        this.events = [];
    }

    // Public methods for manual tracking
    trackCustomEvent(eventName, properties) {
        this.trackEvent(eventName, properties);
    }

    trackConsultationBooked(details) {
        this.trackEvent('consultation_booked', {
            consultationType: details.type,
            preferredTime: details.time,
            contactMethod: details.contact,
            source: 'website_form'
        });
    }

    trackPageView(pageName) {
        this.trackEvent('page_view', {
            pageName: pageName,
            timestamp: Date.now()
        });
    }
}

// Initialize analytics when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.psychologyAnalytics = new PsychologyAnalytics();
    
    // Track JavaScript errors
    window.addEventListener('error', (e) => {
        window.psychologyAnalytics.trackError(e);
    });
    
    // Track unhandled promise rejections
    window.addEventListener('unhandledrejection', (e) => {
        window.psychologyAnalytics.trackEvent('promise_rejection', {
            reason: e.reason?.toString(),
            stack: e.reason?.stack
        });
    });
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PsychologyAnalytics;
}

