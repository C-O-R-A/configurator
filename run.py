# run.py
import subprocess
import sys
import webbrowser
import time
from pathlib import Path

BACKEND = Path(__file__).parent / "apps" / "backend"
FRONTEND_DIST = Path(__file__).parent / "apps" / "frontend" / "dist"

def main():
    # Start backend
    backend = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--port", "8000"],
        cwd=BACKEND,
    )

    # Give it a moment to start
    time.sleep(2)

    # Open browser
    webbrowser.open("http://localhost:8000")

    print("CORA running at http://localhost:8000")
    print("Press Ctrl+C to stop")

    try:
        backend.wait()
    except KeyboardInterrupt:
        backend.terminate()

if __name__ == "__main__":
    main()