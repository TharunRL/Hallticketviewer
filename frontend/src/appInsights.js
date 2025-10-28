import { ApplicationInsights } from '@microsoft/applicationinsights-web';

let appInsights = null;

export const initializeAppInsights = () => {
    const connectionString = import.meta.env.VITE_APPLICATIONINSIGHTS_CONNECTION_STRING;
    
    if (connectionString && !appInsights) {
        appInsights = new ApplicationInsights({
            config: {
                connectionString: connectionString,
                enableAutoRouteTracking: true,
                enableCorsCorrelation: true,
                enableRequestHeaderTracking: true,
                enableResponseHeaderTracking: true,
                enableAjaxErrorStatusText: true,
                enableUnhandledPromiseRejectionTracking: true,
                disableFetchTracking: false,
                disableAjaxTracking: false,
                disableExceptionTracking: false,
            }
        });
        
        appInsights.loadAppInsights();
        appInsights.trackPageView(); // Track initial page load
        
        console.log('Application Insights initialized for frontend');
    }
    
    return appInsights;
};

export const getAppInsights = () => {
    return appInsights;
};

export const trackEvent = (name, properties) => {
    if (appInsights) {
        appInsights.trackEvent({ name, properties });
    }
};

export const trackException = (exception, properties) => {
    if (appInsights) {
        appInsights.trackException({ exception, properties });
    }
};

export const trackTrace = (message, severityLevel, properties) => {
    if (appInsights) {
        appInsights.trackTrace({ message, severityLevel, properties });
    }
};

export default { initializeAppInsights, getAppInsights, trackEvent, trackException, trackTrace };

