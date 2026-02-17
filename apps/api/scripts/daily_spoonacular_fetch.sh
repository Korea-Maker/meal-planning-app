#!/bin/bash
# Daily Spoonacular recipe fetch + GPT-4o-mini translation
# Scheduled via macOS LaunchAgent (midnight daily)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")/.." && pwd)"
UV="/Users/gamepammb402/.local/bin/uv"
LOG_DIR="$SCRIPT_DIR/logs"
LOG_FILE="$LOG_DIR/prefetch_$(date +%Y%m%d).log"

mkdir -p "$LOG_DIR"

cd "$SCRIPT_DIR"

echo "=== Spoonacular Daily Fetch: $(date) ===" >> "$LOG_FILE"

# Step 1: Fetch recipes (max 130 per day within 150-point limit)
echo "[Step 1] Fetching recipes..." >> "$LOG_FILE"
$UV run python -m src.scripts.prefetch_recipes --source spoonacular --max-recipes 130 >> "$LOG_FILE" 2>&1

# Step 2: Translate with GPT-4o-mini
echo "[Step 2] Translating with GPT-4o-mini..." >> "$LOG_FILE"
$UV run python -m src.scripts.prefetch_recipes --source spoonacular --translate-openai >> "$LOG_FILE" 2>&1

echo "=== Done: $(date) ===" >> "$LOG_FILE"

# Clean up logs older than 30 days
find "$LOG_DIR" -name "prefetch_*.log" -mtime +30 -delete 2>/dev/null || true
