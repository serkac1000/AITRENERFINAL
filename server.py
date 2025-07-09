
from flask import Flask, request, jsonify, send_from_directory
import os
import tempfile
import subprocess
import json

app = Flask(__name__)

# Serve static files
@app.route('/')
def index():
    return send_from_directory('.', 'latex_converter.html')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('.', filename)

@app.route('/convert', methods=['POST'])
def convert_latex():
    try:
        # Check if tex file was uploaded
        if 'tex_file' not in request.files:
            return jsonify({'success': False, 'error': 'No LaTeX file uploaded'})
        
        tex_file = request.files['tex_file']
        if tex_file.filename == '':
            return jsonify({'success': False, 'error': 'No file selected'})
        
        # Get form data
        language = request.form.get('language', 'english')
        format_type = request.form.get('format', 'pptx')
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.tex') as tmp_file:
            tex_file.save(tmp_file.name)
            tex_path = tmp_file.name
        
        try:
            # Determine which script to run based on language and format
            if language == "english":
                if format_type == "pptx":
                    script_name = "create_pptx_presentation.py"
                    output_file = "attached_assets/Pose_Recognition_Presentation.pptx"
                else:
                    script_name = "create_pdf_presentation.py"
                    output_file = "attached_assets/Pose_Recognition_Presentation.pdf"
            else:  # russian
                if format_type == "pptx":
                    script_name = "create_pptx_presentation_russian.py"
                    output_file = "attached_assets/Pose_Recognition_Presentation_Russian.pptx"
                else:
                    script_name = "create_pdf_presentation_russian.py"
                    output_file = "attached_assets/Pose_Recognition_Presentation_Russian.pdf"
            
            # Run the presentation creation script
            result = subprocess.run(['python3', script_name], 
                                  capture_output=True, text=True, cwd='.')
            
            if result.returncode == 0:
                # Check if output file exists
                if os.path.exists(output_file):
                    filename = os.path.basename(output_file)
                    return jsonify({
                        'success': True, 
                        'message': 'Presentation created successfully!',
                        'download_url': f'/download/{filename}',
                        'filename': filename
                    })
                else:
                    return jsonify({'success': False, 'error': 'Output file not found'})
            else:
                return jsonify({'success': False, 'error': f'Conversion failed: {result.stderr}'})
        
        finally:
            # Clean up temporary file
            if os.path.exists(tex_path):
                os.unlink(tex_path)
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/download/<filename>')
def download_file(filename):
    return send_from_directory('attached_assets', filename, as_attachment=True)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
