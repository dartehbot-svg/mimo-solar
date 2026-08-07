#!/bin/bash
# Скрипт публикации релиза на GitHub
# Создаёт тег, архив core+bot, и выпускает релиз

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Использование: ./scripts/publish.sh <версия>"
  echo "Пример: ./scripts/publish.sh v1.2.0"
  exit 1
fi

VERSION="$1"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ARCHIVE_NAME="solar-$VERSION.tar.gz"

echo "=== Публикация $VERSION ==="

# Проверка что тег ещё не существует
if git tag -l "$VERSION" | grep -q "$VERSION"; then
  echo "Ошибка: тег $VERSION уже существует"
  exit 1
fi

# Сборка bot
echo "Собираю bot..."
cd "$PROJECT_ROOT/bot"
npm run build

# Создание архива
echo "Создаю архив $ARCHIVE_NAME..."
cd "$PROJECT_ROOT"
tar -czf "/tmp/$ARCHIVE_NAME" \
  --exclude='node_modules' \
  --exclude='.env' \
  --exclude='__pycache__' \
  --exclude='.venv' \
  --exclude='*.pyc' \
  core/ \
  bot/ \
  swe/ \
  ecosystem.config.js

# Создание тега и релиза
echo "Создаю тег $VERSION..."
git tag "$VERSION"

echo "Пушу тег..."
git push origin "$VERSION"

echo "Создаю релиз на GitHub..."
if command -v gh &>/dev/null; then
  gh release create "$VERSION" "/tmp/$ARCHIVE_NAME" \
    --title "Солярная карта $VERSION" \
    --notes "Релиз $VERSION"
else
  echo "GitHub CLI не установлен. Создайте релиз вручную:"
  echo "  https://github.com/$GITHUB_OWNER/$GITHUB_REPO/releases/new?tag=$VERSION"
  echo "  Загрузите архив: /tmp/$ARCHIVE_NAME"
fi

rm -f "/tmp/$ARCHIVE_NAME"

echo "=== Публикация $VERSION завершена ==="
