cd ./apps/backend
pip install pyinstaller --break-system-packages
pyinstaller --onefile --name cora-backend main.py
# produces apps/backend/dist/cora-backend

npm run dist:linux
npm run dist:windows
npm run dist:mac

git tag -a v0.1.0 -m "v0.1.0"
git push origin v0.1.0-alpha

gh release create v0.1.0 \
  "dist/CORA Configurator-0.1.0.AppImage" \
  --title "v0.1.0" \
  --generate-notes