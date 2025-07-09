class LaTeXConverter {
    constructor() {
        this.form = document.getElementById('converterForm');
        this.latexInput = document.getElementById('latexCode');
        this.convertBtn = document.getElementById('convertBtn');
        this.status = document.getElementById('status');

        this.init();
    }

    init() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    async handleSubmit(e) {
        e.preventDefault();

        const latexCode = this.latexInput.value.trim();
        if (!latexCode) {
            this.showStatus('Please enter LaTeX code', 'error');
            return;
        }

        const language = document.querySelector('input[name="language"]:checked').value;
        const format = document.querySelector('input[name="format"]:checked').value;

        this.showStatus('Converting LaTeX to presentation...', 'processing');
        this.convertBtn.disabled = true;

        try {
            const result = await this.convertLatexToPresentation(latexCode, language, format);
            if (result.success) {
                this.showStatus(`✅ Presentation created successfully! File: ${result.filename}`, 'success');
                this.downloadFile(result.filename);
            } else {
                this.showStatus(`❌ Error: ${result.error}`, 'error');
            }
        } catch (error) {
            this.showStatus(`❌ Conversion failed: ${error.message}`, 'error');
        } finally {
            this.convertBtn.disabled = false;
        }
    }

    async convertLatexToPresentation(latexCode, language, format) {
        const response = await fetch('/convert', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                latex: latexCode,
                language: language,
                format: format
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    }

    downloadFile(filename) {
        const link = document.createElement('a');
        link.href = `/download/${filename}`;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    showStatus(message, type) {
        this.status.textContent = message;
        this.status.className = `status ${type}`;
        this.status.style.display = 'block';
    }
}

// Initialize the converter when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LaTeXConverter();
});

function createPresentation() {
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