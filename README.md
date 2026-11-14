# biodozzics

Статическая версия страницы-визитки DOZZIcs для GitHub Pages.

Аватарки и ники подтягиваются не в браузере (Steam и Telegram не отдают CORS),
а GitHub Action'ом `Refresh profiles`: раз в 30 минут он тянет профили,
складывает картинки в `assets/` и данные в `data/profiles.json`, затем коммитит.
Pages пересобирается — страница читает готовый JSON.

## Discord

Аватар Discord берётся через [Lanyard](https://github.com/Phineas/lanyard) — публичный API,
который отдаёт аватар и статус участника их Discord-сервера.

Чтобы включить:

1. Зайти на сервер **discord.gg/lanyard** (иначе Lanyard не видит аккаунт).
2. Узнать свой ID: Discord → Настройки → Расширенные → включить «Режим разработчика»,
   затем ПКМ по своему профилю → «Копировать ID пользователя».
3. Положить ID в переменную репозитория `DISCORD_USER_ID`:
   Settings → Secrets and variables → Actions → Variables → New repository variable.

Пока переменная не задана, на сайте у Discord остаётся только ник и нет ссылки.
Когда задана — строка ведёт на `https://discord.com/users/<ID>` (открывает профиль в приложении или браузере).

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
