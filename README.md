# biodozzics

Статическая версия страницы-визитки DOZZIcs для GitHub Pages.

Аватарки и ники подтягиваются не в браузере (Steam и Telegram не отдают CORS),
а GitHub Action'ом `Refresh profiles`: раз в 30 минут он тянет профили,
складывает картинки в `assets/` и данные в `data/profiles.json`, затем коммитит.
Pages пересобирается — страница читает готовый JSON.

## Структура

```
.
├── index.html                 # вся страница: разметка, стили, анимация фона
├── assets/                    # аватарки (перезаписываются экшеном)
├── data/profiles.json         # ники + пути к аватаркам (генерируется)
├── scripts/refresh.js         # сборщик данных, запускается в Actions
└── .github/workflows/refresh.yml
```

## Локальный запуск

```bash
npx serve .
# или: python -m http.server 8080
```

Без сервера `data/profiles.json` не обновится, но страница откроется
с последними сохранёнными данными.

Обновить данные вручную:

```bash
node scripts/refresh.js
```

## Как обновить данные сейчас

Actions → **Refresh profiles** → **Run workflow**.
