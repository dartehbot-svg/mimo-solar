#!/bin/bash
# Скрипт автообновления core/bot с GitHub Releases
# Запускается по расписанию через cron или PM2

set -euo pipefail

INSTALL_DIR="${SOLAR_INSTALL_DIR:-$HOME/solar}"
VERSIONS_DIR="$INSTALL_DIR/versions"
CURRENT_LINK="$INSTALL_DIR/current"
VERSION_FILE="$INSTALL_DIR/current_version.txt"
LOG_FILE="$INSTALL_DIR/update.log"
MAX_VERSIONS="${MAX_VERSIONS:-5}"

GITHUB_OWNER="${GITHUB_OWNER:-OWNER}"
GITHUB_REPO="${GITHUB_REPO:-REPO}"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"
  echo "$*"
}

get_current_version() {
  if [ -f "$VERSION_FILE" ]; then
    cat "$VERSION_FILE"
  else
    echo "0.0.0"
  fi
}

get_latest_version() {
  local response
  response=$(curl -s "https://api.github.com/repos/$GITHUB_OWNER/$GITHUB_REPO/releases/latest")
  echo "$response" | grep '"tag_name"' | sed -E 's/.*"tag_name":\s*"([^"]+)".*/\1/'
}

get_download_url() {
  local version="$1"
  local response
  response=$(curl -s "https://api.github.com/repos/$GITHUB_OWNER/$GITHUB_REPO/releases/tags/$version")
  echo "$response" | grep '"browser_download_url"' | head -1 | sed -E 's/.*"browser_download_url":\s*"([^"]+)".*/\1/'
}

version_gt() {
  [ "$1" != "$2" ] && [ "$(printf '%s\n' "$1" "$2" | sort -V | head -n1)" = "$2" ]
}

cleanup_old_versions() {
  local count
  count=$(ls -1d "$VERSIONS_DIR"/v* 2>/dev/null | wc -l | tr -d ' ')
  if [ "$count" -gt "$MAX_VERSIONS" ]; then
    local to_remove=$((count - MAX_VERSIONS))
    ls -1d "$VERSIONS_DIR"/v* | head -n "$to_remove" | while read -r dir; do
      log "Удаляю старую версию: $(basename "$dir")"
      rm -rf "$dir"
    done
  fi
}

do_update() {
  local version="$1"
  local download_url="$2"
  local target_dir="$VERSIONS_DIR/$version"

  log "Начинаю обновление до $version"

  mkdir -p "$target_dir"

  local archive="/tmp/solar-$version.tar.gz"
  curl -sL "$download_url" -o "$archive"
  tar -xzf "$archive" -C "$target_dir" --strip-components=1
  rm -f "$archive"

  # Установка зависимостей core
  if [ -d "$target_dir/core" ]; then
    cd "$target_dir/core"
    if command -v uv &>/dev/null; then
      uv sync --no-dev 2>>"$LOG_FILE" || true
    else
      pip install -r requirements.txt 2>>"$LOG_FILE" || pip install pyswisseph fastapi uvicorn pydantic timezonefinder reportlab 2>>"$LOG_FILE" || true
    fi
  fi

  # Установка зависимостей bot + сборка
  if [ -d "$target_dir/bot" ]; then
    cd "$target_dir/bot"
    npm install --production 2>>"$LOG_FILE" || true
    npm run build 2>>"$LOG_FILE" || true
  fi

  # Переключение симлинка
  ln -sfn "$target_dir" "$CURRENT_LINK"
  echo "$version" > "$VERSION_FILE"

  # Перезапуск процессов
  if command -v pm2 &>/dev/null; then
    cd "$INSTALL_DIR"
    pm2 restart core 2>>"$LOG_FILE" || true
    pm2 restart bot 2>>"$LOG_FILE" || true
  fi

  cleanup_old_versions

  log "Обновление до $version завершено успешно"
}

main() {
  mkdir -p "$VERSIONS_DIR"

  local current_version
  current_version=$(get_current_version)

  local latest_version
  latest_version=$(get_latest_version)

  if [ -z "$latest_version" ] || [ "$latest_version" = "null" ]; then
    log "Не удалось получить версию с GitHub"
    exit 1
  fi

  log "Текущая: $current_version, последняя: $latest_version"

  if version_gt "$latest_version" "$current_version"; then
    local download_url
    download_url=$(get_download_url "$latest_version")

    if [ -z "$download_url" ] || [ "$download_url" = "null" ]; then
      log "Не удалось получить URL скачивания для $latest_version"
      exit 1
    fi

    do_update "$latest_version" "$download_url"
  else
    log "Обновление не требуется"
  fi
}

main "$@"
