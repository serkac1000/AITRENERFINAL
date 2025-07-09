
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
