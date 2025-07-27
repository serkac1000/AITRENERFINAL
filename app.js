class LaTeXConverter {
    constructor() {
        this.texFileInput = document.getElementById('tex-file');
        this.imageFilesInput = document.getElementById('image-files');
        this.videoFilesInput = document.getElementById('video-files');
        this.startCreateBtn = document.getElementById('startCreateBtn');
        this.status = document.getElementById('status');
        this.mediaFiles = [];

        this.init();
    }

    init() {
        this.texFileInput.addEventListener('change', (e) => this.handleTexFileSelect(e));
        this.imageFilesInput.addEventListener('change', (e) => this.handleMediaFileSelect(e, 'image'));
        this.videoFilesInput.addEventListener('change', (e) => this.handleMediaFileSelect(e, 'video'));
    }

    handleTexFileSelect(e) {
        const file = e.target.files[0];
        const selectedDiv = document.getElementById('tex-file-selected');

        if (file) {
            selectedDiv.textContent = `Selected: ${file.name}`;
            selectedDiv.style.display = 'block';
        } else {
            selectedDiv.style.display = 'none';
        }
    }

    handleMediaFileSelect(e, type) {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            this.mediaFiles.push({ file, type });
        });
        this.updateMediaFilesList();
    }

    updateMediaFilesList() {
        const listDiv = document.getElementById('media-files-list');
        if (this.mediaFiles.length === 0) {
            listDiv.textContent = 'No media files selected';
        } else {
            listDiv.innerHTML = this.mediaFiles.map((item, index) => 
                `<div>${item.type === 'image' ? '📸' : '🎥'} ${item.file.name}</div>`
            ).join('');
        }
    }

    showStatus(message, type) {
        this.status.textContent = message;
        this.status.className = `status ${type}`;
        this.status.style.display = 'block';
    }

    // Enhanced pose recognition with better accuracy
    async performPoseRecognition(videoElement, model) {
        try {
            // More predictions for better accuracy
            const predictions = [];
            for (let i = 0; i < 5; i++) {
                const prediction = await model.predict(videoElement);
                predictions.push(prediction);
                await new Promise(resolve => setTimeout(resolve, 50)); // Optimized delay between predictions
            }
            
            // Calculate average confidence for each pose
            const avgPredictions = {};
            predictions[0].forEach((_, index) => {
                const poseClass = predictions[0][index].className;
                const confidences = predictions.map(p => p[index].probability);
                const avgConfidence = confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
                avgPredictions[poseClass] = avgConfidence;
            });
            
            // Find best prediction with enhanced confidence
            let bestPose = null;
            let bestConfidence = 0;
            
            Object.entries(avgPredictions).forEach(([className, confidence]) => {
                // Apply confidence boost for stable predictions
                const stabilityBoost = this.calculateStabilityBoost(className, confidence);
                const enhancedConfidence = Math.min(confidence + stabilityBoost, 1.0);
                
                if (enhancedConfidence > bestConfidence) {
                    bestConfidence = enhancedConfidence;
                    bestPose = className;
                }
            });
            
            return {
                pose: bestPose,
                confidence: bestConfidence,
                allPredictions: avgPredictions
            };
        } catch (error) {
            console.error('Pose recognition error:', error);
            return { pose: null, confidence: 0, allPredictions: {} };
        }
    }
    
    calculateStabilityBoost(className, confidence) {
        // Store recent predictions for stability analysis
        if (!this.recentPredictions) {
            this.recentPredictions = {};
        }
        if (!this.recentPredictions[className]) {
            this.recentPredictions[className] = [];
        }
        
        this.recentPredictions[className].push(confidence);
        
        // Keep only last 5 predictions
        if (this.recentPredictions[className].length > 5) {
            this.recentPredictions[className].shift();
        }
        
        // Calculate stability boost based on consistency
        const recent = this.recentPredictions[className];
        if (recent.length >= 3) {
            const variance = this.calculateVariance(recent);
            const stabilityBoost = Math.max(0, (0.3 - variance) * 0.5); // Up to 0.15 boost for stable predictions
            return stabilityBoost;
        }
        
        return 0;
    }
    
    calculateVariance(values) {
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
        return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
    }
}

// Initialize the converter when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.latexConverter = new LaTeXConverter();
});

function addImages() {
    document.getElementById('image-files').click();
}

function addVideos() {
    document.getElementById('video-files').click();
}

function clearMedia() {
    if (window.latexConverter) {
        window.latexConverter.mediaFiles = [];
        window.latexConverter.updateMediaFilesList();
    }
    document.getElementById('image-files').value = '';
    document.getElementById('video-files').value = '';
}

function startCreate() {
    console.log('Start Create button clicked');
    const fileInput = document.getElementById('tex-file');
    const languageInputs = document.querySelectorAll('input[name="language"]');
    const formatInputs = document.querySelectorAll('input[name="format"]');

    // Check if file is selected
    if (!fileInput.files || fileInput.files.length === 0) {
        showStatus('Please select a LaTeX file first', 'error');
        return;
    }

    // Get selected language
    let selectedLanguage = 'english';
    for (const input of languageInputs) {
        if (input.checked) {
            selectedLanguage = input.value;
            break;
        }
    }

    // Get selected format
    let selectedFormat = 'pptx';
    for (const input of formatInputs) {
        if (input.checked) {
            selectedFormat = input.value;
            break;
        }
    }

    showStatus('Creating presentation...', 'processing');

    const formData = new FormData();
    formData.append('tex_file', fileInput.files[0]);
    formData.append('language', selectedLanguage);
    formData.append('format', selectedFormat);

    // Add media files if any
    if (window.latexConverter && window.latexConverter.mediaFiles.length > 0) {
        window.latexConverter.mediaFiles.forEach((item, index) => {
            formData.append(`media_${index}`, item.file);
            formData.append(`media_type_${index}`, item.type);
        });
    }

    fetch('/convert', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showStatus('Presentation created successfully!', 'success');
            if (data.download_url) {
                // Create download link
                const link = document.createElement('a');
                link.href = data.download_url;
                link.download = data.filename || 'presentation';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } else {
            showStatus('Error: ' + data.error, 'error');
        }
    })
    .catch(error => {
        showStatus('Error: ' + error.message, 'error');
    });
}

function showStatus(message, type) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = `status ${type}`;
    status.style.display = 'block';
}