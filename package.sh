cd ~/Desktop/CORA/Software/cora_configurator

# rebuild backend (with matplotlib exclusion)
cd apps/backend
source .venv-build/bin/activate
pyinstaller --onefile --name cora-backend --exclude-module matplotlib main.py
deactivate
cd ../..

# rebuild electron package
npm run dist:linux

# uninstall old, install fresh
sudo apt remove cobot-configurator
sudo apt install ./dist/cobot-configurator_0.1.0-alpha_amd64.deb

# reapply sandbox permission fix (resets every install)
sudo chown root:root "/opt/cora-configurator/chrome-sandbox"
sudo chmod 4755 "/opt/cora-configurator/chrome-sandbox"

cobot-configurator