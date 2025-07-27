
// Pose Recognition Configuration
const PoseConfig = {
    // Enhanced accuracy settings
    recognition: {
        multipleReadings: 3,          // Take 3 readings per prediction
        readingDelay: 50,             // 50ms between readings
        confidenceThreshold: 0.45,    // Lower threshold with enhancements
        stabilityWindow: 5,           // Remember last 5 predictions
        minimumStabilityFrames: 3     // Need 3 stable frames
    },
    
    // Confidence enhancement factors
    enhancement: {
        temporalSmoothing: 0.25,      // 25% weight to previous predictions
        stabilityBoost: 0.2,          // Up to 20% boost for stable predictions
        confidenceAmplifier: 1.15,    // 15% amplification for strong predictions
        varianceThreshold: 0.08       // Maximum allowed variance for stability
    },
    
    // Camera and preprocessing settings
    camera: {
        preferredWidth: 640,
        preferredHeight: 480,
        frameRate: 15,               // Reduced for better processing
        facingMode: 'user'
    },
    
    // Model optimization
    model: {
        flipHorizontal: true,
        maxDetections: 1,
        scoreThreshold: 0.3,
        nmsRadius: 20
    },
    
    // UI feedback settings
    ui: {
        confidenceUpdateInterval: 100,
        smoothTransitions: true,
        showDebugInfo: false
    }
};

// Utility functions for pose recognition
const PoseUtils = {
    // Normalize confidence score with enhancements
    normalizeConfidence(rawConfidence, className, history = []) {
        let normalized = rawConfidence;
        
        // Apply stability boost if we have history
        if (history.length >= 3) {
            const variance = this.calculateVariance(history.slice(-5));
            if (variance < PoseConfig.enhancement.varianceThreshold) {
                const stabilityBoost = (PoseConfig.enhancement.varianceThreshold - variance) * 
                                     PoseConfig.enhancement.stabilityBoost;
                normalized = Math.min(normalized + stabilityBoost, 1.0);
            }
        }
        
        // Amplify strong predictions
        if (rawConfidence > 0.6) {
            normalized = Math.min(normalized * PoseConfig.enhancement.confidenceAmplifier, 1.0);
        }
        
        return normalized;
    },
    
    // Calculate variance for stability measurement
    calculateVariance(values) {
        if (values.length < 2) return 0;
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    },
    
    // Smooth confidence changes for better UX
    smoothConfidence(currentConf, previousConf, smoothingFactor = 0.3) {
        return previousConf + (currentConf - previousConf) * smoothingFactor;
    },
    
    // Determine if pose is confident enough
    isPoseConfident(confidence, threshold = null) {
        const actualThreshold = threshold || PoseConfig.recognition.confidenceThreshold;
        return confidence >= actualThreshold;
    }
};

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PoseConfig, PoseUtils };
} else if (typeof window !== 'undefined') {
    window.PoseConfig = PoseConfig;
    window.PoseUtils = PoseUtils;
}
