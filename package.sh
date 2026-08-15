cd ./apps/backend
pip install pyinstaller --break-system-packages
pyinstaller --onefile --name cora-backend main.py
# produces apps/backend/dist/cora-backend

npm run dist:linux
npm run dist:windows
npm run dist:mac