#!/bin/bash
set -e

# Wrapper to run the app and capture stdout/stderr to a log for desktop launches
DIR="$(cd "$(dirname "$0")" && pwd)"
LOG=/tmp/cora_launcher.log
echo "=== CORA launcher started at $(date) ===" >> "$LOG"
echo "CWD: $DIR" >> "$LOG"
cd "$DIR"
"$DIR"/run.sh >> "$LOG" 2>&1
