cd "$(dirname "$0")"
if [ ! -d ".venv" ]; then
  echo "Creating virtual environment..."
  python3 -m venv .venv
fi

git submodule update --init --recursive

source .venv/bin/activate
pip install -r apps/backend/requirements.txt

cd apps/frontend
npm install
npm run build
cd ../..
echo "Setup complete"

apt install -y docker.io docker-compose

DIR="$(cd "$(dirname "$0")" && pwd)"
cat > CORA.desktop << EOF
[Desktop Entry]
Name=CORA Configurator
Exec=$DIR/run.sh
Icon=$DIR/assets/icon.png
Type=Application
Terminal=false
EOF
chmod +x CORA.desktop
echo "Double-click CORA.desktop to launch"

cp CORA.desktop ~/Desktop/
echo "CORA shortcut added to Desktop — right-click it and select 'Allow Launching'"