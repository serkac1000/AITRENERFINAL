
#!/usr/bin/env python3
"""
LaTeX to Presentation Converter Launcher
Runs the LaTeX converter GUI application
"""

import sys
import os
import subprocess

def install_requirements():
    """Install required packages"""
    try:
        # Try importing required packages
        import tkinter
        from pptx import Presentation
        from reportlab.pdfgen import canvas
        from PIL import Image
        print("✅ All required packages are available")
        return True
    except ImportError as e:
        print(f"📦 Installing missing package: {e.name if hasattr(e, 'name') else 'unknown'}")
        try:
            subprocess.check_call([sys.executable, '-m', 'pip', 'install', '-r', 'latex_requirements.txt'])
            print("✅ Packages installed successfully")
            return True
        except subprocess.CalledProcessError:
            print("❌ Failed to install packages")
            return False

def main():
    print("🚀 Starting LaTeX to Presentation Converter...")
    
    # Check and install requirements
    if not install_requirements():
        print("❌ Cannot start application - dependency installation failed")
        return
    
    # Import and run the converter app
    try:
        from latex_converter_app import LatexConverterApp
        import tkinter as tk
        
        print("✅ Launching GUI application...")
        root = tk.Tk()
        app = LatexConverterApp(root)
        root.mainloop()
        
    except Exception as e:
        print(f"❌ Error running application: {e}")
        input("Press Enter to exit...")

if __name__ == "__main__":
    main()
