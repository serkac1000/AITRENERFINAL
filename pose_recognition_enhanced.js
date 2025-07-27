
// Enhanced Pose Recognition Module
class EnhancedPoseRecognition {
    constructor() {
        this.model = null;
        this.isModelLoaded = false;
        this.predictionHistory = {};
        this.confidenceThreshold = 0.25; // Lower threshold for better detection
        this.stabilityWindow = 8; // Longer window for stability
        this.enhancementFactors = {
            temporalSmoothing: 0.35, // Increased smoothing
            confidenceBoost: 0.25, // Higher boost for strong predictions
            stabilityWeight: 0.4 // More weight to stability
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
            const predictions = await this.getMultiplePredictions(canvas, 5);
            
            // Filter out low-quality predictions
            const filteredPredictions = this.filterPredictions(predictions);
            
            // Apply temporal smoothing
            const smoothedPredictions = this.applyTemporalSmoothing(filteredPredictions);
            
            // Calculate enhanced confidence with better validation
            const enhancedResult = this.calculateEnhancedConfidence(smoothedPredictions);
            
            // Apply pose validation
            const validatedResult = this.validatePoseResult(enhancedResult);
            
            // Update prediction history
            this.updatePredictionHistory(validatedResult);
            
            return validatedResult;
        } catch (error) {
            console.error('Enhanced prediction error:', error);
            return { pose: 'Error', confidence: 0 };
        }
    }

    async getMultiplePredictions(canvas, count = 7) {
        const predictions = [];
        
        for (let i = 0; i < count; i++) {
            try {
                const prediction = await this.model.predict(canvas);
                if (prediction && prediction.length > 0) {
                    predictions.push(prediction);
                }
                
                // Varied delay for better sampling
                if (i < count - 1) {
                    const delay = 20 + Math.random() * 20; // 20-40ms random delay
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            } catch (error) {
                console.warn(`Prediction ${i + 1} failed:`, error);
            }
        }
        
        return predictions;
    }

    filterPredictions(predictions) {
        if (predictions.length === 0) return [];
        
        // Remove predictions where all confidences are very low
        return predictions.filter(prediction => {
            const maxConfidence = Math.max(...prediction.map(p => p.probability));
            return maxConfidence > 0.1; // Filter out very weak predictions
        });
    }

    validatePoseResult(result) {
        if (!result || !result.pose) {
            return { pose: 'Unknown', confidence: 0 };
        }

        // Stricter confidence threshold for better accuracy
        if (result.confidence < 0.25) {
            return { 
                pose: 'Unknown', 
                confidence: result.confidence,
                originalPose: result.pose,
                reason: 'Low confidence'
            };
        }

        // Enhanced stability checking
        const poseHistory = this.predictionHistory[result.pose] || [];
        if (poseHistory.length >= 2) {
            const recentConfidences = poseHistory.slice(-4);
            const avgRecent = recentConfidences.reduce((sum, conf) => sum + conf, 0) / recentConfidences.length;
            const variance = this.calculateVariance(recentConfidences);
            
            // More sensitive to confidence jumps and variance
            if (Math.abs(result.confidence - avgRecent) > 0.3 || variance > 0.08) {
                return {
                    pose: 'Transitioning',
                    confidence: Math.max(result.confidence * 0.8, 0.15),
                    originalPose: result.pose,
                    reason: 'Unstable detection',
                    variance: variance
                };
            }
        }

        // Boost confidence for very stable predictions
        if (poseHistory.length >= 5) {
            const variance = this.calculateVariance(poseHistory.slice(-5));
            if (variance < 0.05 && result.confidence > 0.4) {
                result.confidence = Math.min(result.confidence * 1.15, 0.95);
                result.stabilityBoost = true;
            }
        }

        return result;
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
        
        // Calculate weighted average for each pose class
        const poseScores = {};
        const poseCounts = {};
        
        predictions.forEach(prediction => {
            if (prediction.probability > 0.05) { // Only consider meaningful predictions
                const className = prediction.className;
                if (!poseScores[className]) {
                    poseScores[className] = 0;
                    poseCounts[className] = 0;
                }
                poseScores[className] += prediction.probability;
                poseCounts[className]++;
            }
        });
        
        // Find best pose with weighted scoring
        let bestPose = null;
        let bestScore = 0;
        
        Object.entries(poseScores).forEach(([className, totalScore]) => {
            const count = poseCounts[className];
            const avgScore = totalScore / count;
            
            // Weight by consistency (more detections = more reliable)
            const consistencyWeight = Math.min(count / predictions.length, 1.0);
            const weightedScore = avgScore * (0.7 + 0.3 * consistencyWeight);
            
            if (weightedScore > bestScore) {
                bestScore = weightedScore;
                bestPose = className;
            }
        });
        
        if (!bestPose) {
            return { pose: 'No Detection', confidence: 0 };
        }
        
        // Apply enhancement factors
        let enhancedConfidence = bestScore;
        
        // Stability boost
        const stabilityBoost = this.calculateStabilityBoost(bestPose, bestScore);
        enhancedConfidence = Math.min(enhancedConfidence + stabilityBoost, 1.0);
        
        // Confidence boost for strong predictions
        if (bestScore > 0.6) {
            const confidenceBoost = this.enhancementFactors.confidenceBoost * (bestScore - 0.6);
            enhancedConfidence = Math.min(enhancedConfidence + confidenceBoost, 1.0);
        }
        
        return {
            pose: bestPose,
            confidence: enhancedConfidence,
            originalConfidence: bestScore,
            consistency: poseCounts[bestPose] / predictions.length,
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

    // Tune recognition parameters for better accuracy
    tuneForAccuracy(options = {}) {
        this.confidenceThreshold = options.threshold || 0.3;
        this.stabilityWindow = options.stabilityWindow || 7;
        this.enhancementFactors = {
            temporalSmoothing: options.temporalSmoothing || 0.3,
            confidenceBoost: options.confidenceBoost || 0.2,
            stabilityWeight: options.stabilityWeight || 0.35
        };
        console.log('Pose recognition tuned for better accuracy');
    }

    // Get detailed recognition stats
    getRecognitionStats() {
        const stats = {};
        Object.entries(this.predictionHistory).forEach(([pose, history]) => {
            if (history.length > 0) {
                stats[pose] = {
                    detections: history.length,
                    avgConfidence: history.reduce((sum, conf) => sum + conf, 0) / history.length,
                    stability: this.calculateVariance(history.slice(-5))
                };
            }
        });
        return stats;
    }
}

// Export for use in main app
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedPoseRecognition;
} else if (typeof window !== 'undefined') {
    window.EnhancedPoseRecognition = EnhancedPoseRecognition;
}
