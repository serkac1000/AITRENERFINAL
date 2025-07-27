
// Enhanced Pose Recognition Module
class EnhancedPoseRecognition {
    constructor() {
        this.model = null;
        this.isModelLoaded = false;
        this.predictionHistory = {};
        this.confidenceThreshold = 0.5;
        this.stabilityWindow = 5;
        this.enhancementFactors = {
            temporalSmoothing: 0.2,
            confidenceBoost: 0.15,
            stabilityWeight: 0.3
        };
    }

    async loadModel(modelUrl) {
        try {
            console.log('Loading enhanced pose recognition model...');
            this.model = await tmPose.load(modelUrl + 'model.json', modelUrl + 'metadata.json');
            this.isModelLoaded = true;
            console.log('Enhanced model loaded successfully');
            return true;
        } catch (error) {
            console.error('Failed to load enhanced model:', error);
            return false;
        }
    }

    async predictPoseEnhanced(canvas) {
        if (!this.isModelLoaded || !this.model) {
            return { pose: 'No Model', confidence: 0 };
        }

        try {
            // Get multiple predictions for stability
            const predictions = await this.getMultiplePredictions(canvas, 3);
            
            // Apply temporal smoothing
            const smoothedPredictions = this.applyTemporalSmoothing(predictions);
            
            // Calculate enhanced confidence
            const enhancedResult = this.calculateEnhancedConfidence(smoothedPredictions);
            
            // Update prediction history
            this.updatePredictionHistory(enhancedResult);
            
            return enhancedResult;
        } catch (error) {
            console.error('Enhanced prediction error:', error);
            return { pose: 'Error', confidence: 0 };
        }
    }

    async getMultiplePredictions(canvas, count = 3) {
        const predictions = [];
        
        for (let i = 0; i < count; i++) {
            try {
                const prediction = await this.model.predict(canvas);
                predictions.push(prediction);
                
                // Small delay between predictions for variation
                if (i < count - 1) {
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
            } catch (error) {
                console.warn(`Prediction ${i + 1} failed:`, error);
            }
        }
        
        return predictions;
    }

    applyTemporalSmoothing(predictions) {
        if (predictions.length === 0) return [];
        
        // Average predictions across time
        const classNames = predictions[0].map(p => p.className);
        const smoothedPredictions = [];
        
        classNames.forEach((className, index) => {
            const confidences = predictions.map(pred => pred[index].probability);
            const avgConfidence = confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
            
            // Apply temporal smoothing with history
            const historicalWeight = this.enhancementFactors.temporalSmoothing;
            const currentWeight = 1 - historicalWeight;
            
            let finalConfidence = avgConfidence * currentWeight;
            
            if (this.predictionHistory[className] && this.predictionHistory[className].length > 0) {
                const recentAvg = this.getRecentAverage(className);
                finalConfidence += recentAvg * historicalWeight;
            }
            
            smoothedPredictions.push({
                className: className,
                probability: Math.min(finalConfidence, 1.0)
            });
        });
        
        return smoothedPredictions;
    }

    calculateEnhancedConfidence(predictions) {
        if (predictions.length === 0) {
            return { pose: 'No Detection', confidence: 0 };
        }
        
        // Find the pose with highest confidence
        let bestPose = predictions[0];
        for (let prediction of predictions) {
            if (prediction.probability > bestPose.probability) {
                bestPose = prediction;
            }
        }
        
        // Apply confidence enhancement factors
        let enhancedConfidence = bestPose.probability;
        
        // Stability boost
        const stabilityBoost = this.calculateStabilityBoost(bestPose.className, bestPose.probability);
        enhancedConfidence = Math.min(enhancedConfidence + stabilityBoost, 1.0);
        
        // Confidence boost for strong predictions
        if (bestPose.probability > 0.7) {
            const confidenceBoost = this.enhancementFactors.confidenceBoost * (bestPose.probability - 0.7);
            enhancedConfidence = Math.min(enhancedConfidence + confidenceBoost, 1.0);
        }
        
        return {
            pose: bestPose.className,
            confidence: enhancedConfidence,
            originalConfidence: bestPose.probability,
            allPredictions: predictions
        };
    }

    calculateStabilityBoost(className, confidence) {
        if (!this.predictionHistory[className] || this.predictionHistory[className].length < 3) {
            return 0;
        }
        
        const recent = this.predictionHistory[className].slice(-this.stabilityWindow);
        const variance = this.calculateVariance(recent);
        
        // Lower variance = more stability = higher boost
        const maxVariance = 0.1;
        const stabilityScore = Math.max(0, (maxVariance - variance) / maxVariance);
        
        return stabilityScore * this.enhancementFactors.stabilityWeight * 0.2; // Max 0.06 boost
    }

    updatePredictionHistory(result) {
        const className = result.pose;
        if (!this.predictionHistory[className]) {
            this.predictionHistory[className] = [];
        }
        
        this.predictionHistory[className].push(result.confidence);
        
        // Keep only recent history
        if (this.predictionHistory[className].length > this.stabilityWindow * 2) {
            this.predictionHistory[className] = this.predictionHistory[className].slice(-this.stabilityWindow);
        }
    }

    getRecentAverage(className) {
        if (!this.predictionHistory[className] || this.predictionHistory[className].length === 0) {
            return 0;
        }
        
        const recent = this.predictionHistory[className].slice(-3); // Last 3 predictions
        return recent.reduce((sum, conf) => sum + conf, 0) / recent.length;
    }

    calculateVariance(values) {
        if (values.length < 2) return 0;
        
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
        return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
    }

    setConfidenceThreshold(threshold) {
        this.confidenceThreshold = Math.max(0.1, Math.min(0.9, threshold));
    }

    clearHistory() {
        this.predictionHistory = {};
    }
}

// Export for use in main app
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedPoseRecognition;
} else if (typeof window !== 'undefined') {
    window.EnhancedPoseRecognition = EnhancedPoseRecognition;
}
