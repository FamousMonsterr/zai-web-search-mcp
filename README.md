# zai-web-search-mcp

Плагин для **DeepSeek Harness (dsh) desktop**, который подключает возможности подписки **GLM Coding Plan (Z.ai)**:

1. **Веб-поиск** — встроенный инструмент `web_search` работает через MCP-сервер Z.ai `web_search_prime` (провайдер `zai-mcp`).
2. **MCP-инструмент** — тот же сервер смонтирован мостом как `mcp__zai__web_search_prime`.
3. **Чип квоты** — индикатор рядом с композером: 5-часовое и недельное окна кредитов, сбросы и число вызовов MCP-инструментов за 30 дней (те же данные, что показывает zcode).

Ключ API **не хранится в этом репозитории и в коде**: плагин читает ссылку `ZAI_API_KEY` из хранилища креденшелов Harness (`~/.dsh/.credentials.yaml`).

## Проверено

Все три интеграции проверены вживую (см. `verify.ps1`):

| Интеграция | Endpoint | Статус |
|---|---|---|
| MCP поиск | `https://api.z.ai/api/mcp/web_search_prime/mcp` | ✅ initialize + tools/list + tools/call |
| Квота кредитов | `https://api.z.ai/api/monitor/usage/quota/limit` | ✅ окна 5ч / неделя |
| Использование MCP | `https://api.z.ai/api/monitor/usage/tool-usage` | ✅ счётчик за 30 дней |

## Установка на новом компьютере

Требования: установлен и хотя бы один раз запущен **DeepSeek Harness desktop** (должен существовать `~/.dsh`), **PowerShell 7+ (pwsh)**, действующий ключ GLM Coding Plan.

```powershell
git clone https://github.com/FamousMonsterr/zai-web-search-mcp.git
cd zai-web-search-mcp

# ключ можно передать так, чтобы не вводить вручную:
$env:ZAI_API_KEY = "<ваш ключ>"; pwsh -NoProfile -File install.ps1
# или просто:
pwsh -NoProfile -File install.ps1
```

Установщик (идемпотентный, можно перезапускать):

- прописывает в `~/.dsh/profiles/desktop/package.json` бандл `@local/zai-web-search-mcp` и `link:`-зависимость на папку клона;
- проверяет/добавляет `ZAI_API_KEY` в `~/.dsh/.credentials.yaml`;
- запускает `pnpm install` в профиле (используется node/pnpm из рантайма dsh — ничего ставить не нужно).

После установки **перезапустите DeepSeek Harness**.

## Проверка после установки

```powershell
pwsh -NoProfile -File verify.ps1
```

Скрипт проверяет живьём все три endpoint'а Z.ai (ключ читается из креденшелов и не печатается).

В самом приложении: чип квоты появляется рядом с индикаторами композера, когда провайдер по умолчанию — `zai`; поиск доступен через `web_search` и инструмент `mcp__zai__web_search_prime`.

## Обновление

```powershell
cd zai-web-search-mcp
git pull
pwsh -NoProfile -File install.ps1   # перепривяжет link: на актуальную папку и переустановит
```

Затем перезапустите DeepSeek Harness. Если правите плагин в «рабочей» копии (например в `Documents/deepseek-harness/default-workspace/zai-web-search-mcp`) — скопируйте изменённые файлы сюда и закоммитьте.

## Удаление

1. Удалите `@local/zai-web-search-mcp` из `dependencies` и из `dsh.profile.bundles` в `~/.dsh/profiles/desktop/package.json`.
2. Удалите `node_modules/@local/zai-web-search-mcp` в профиле и запустите там `pnpm install` (рантаймовым pnpm).
3. (Опционально) удалите строку `ZAI_API_KEY` из `~/.dsh/.credentials.yaml`.
4. Перезапустите DeepSeek Harness.

## Состав

```
index.js           host-плагин: провайдер поиска, MCP-мост, сервис квоты (/zai-quota)
client.js          веб-клиент: чип квоты (React) с поповером окон и счётчиком MCP
cordis.patch.yml   монтирование плагина + выбор searchProvider: zai-mcp + session-query-sqlite
locale/{en,ru}.json
icon.svg
install.ps1        установщик (pwsh)
verify.ps1         live-проверка всех интеграций Z.ai
scripts/install.mjs логика установки (запускается рантаймовым node)
scripts/verify.mjs  логика проверки
```

## Замечания

- Квота кэшируется на хосте 60 секунд; фоновое обновление — раз в 5 минут.
- Сбой запуска MCP-моста не ломает поиск: провайдер `web_search` продолжает работать.
- Если ключ отклонён (HTTP 401/403), обновите `ZAI_API_KEY` в Models/credentials и перезапустите приложение.
