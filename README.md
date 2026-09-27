# KasaEvlogi59

# Каса / ЕВЛОГИ 59 — Web App

Това е статично уеб приложение, което:

- чете Excel файл от папката `data/`
- показва всеки лист от таблицата като отделен бутон
- визуализира данните в табличен изглед
- се публикува автоматично в GitHub Pages чрез GitHub Actions

## Какво е нужно

- Excel файл, записан като `data/kasa.xlsx`
- GitHub repository
- `GitHub Pages` активиран

## Как да го използвате

1. Поставете вашата Excel таблица в `data/` под името `kasa.xlsx`.
2. Качете проекта в GitHub.
3. Отворете `Settings -> Pages`.
4. Изберете `GitHub Actions` като source.
5. Push-нете в `main` branch.
6. След няколко минути приложението ще е достъпно на URL на GitHub Pages.

## Структура

- `index.html` — главният екран
- `styles.css` — стилове
- `app.js` — логика за четене на XLSX и показване по листове
- `.github/workflows/deploy.yml` — автоматично деплойване
- `data/README.md` — инструкции за файла с данните

## Бележка

Приложението не променя оригиналната Excel таблица. То само я чете и я показва.

Ако в проекта няма реална `kasa.xlsx`, приложението ще покаже съобщение за липсващ файл, но структурата е подготвена за работа с реалната таблица.

## Зареждане от Google Sheets (онлайн)

Можете да конфигурирате приложението да чете директно от Google Spreadsheet (без локален файл). За да работи това:

1. Създайте API ключ:
	- Отидете в Google Cloud Console → APIs & Services → Credentials → Create credentials → API key.
	- Активирайте Google Sheets API (Library → Google Sheets API) за проекта.
2. Отворете `app.js` и задайте стойност на `GOOGLE_API_KEY` (в горната част на файла). ID-то на таблицата е предварително зададено като `GOOGLE_SPREADSHEET_ID`.
3. Рестартирайте локалния сървър и приложението ще зареди данните от онлайн таблицата. Приложението прави автоматично опресняване на данните на всеки 30 секунди.

Бележки:
- Ако предпочитате да не използвате API ключ, има алтернативи (Publish to web + CSV export), но те не са автоматично поддържани от текущата версия.
- Ако срещнете проблеми с разрешения, уверете се, че spreadsheet-а е споделен с поне "Anyone with the link can view" или използвайте API ключ с достъп.

## Версия

Тази версия на приложението е 1.0.

## Tagging a release (git)

To tag this release locally and push it to the remote repository, run:

```bash
git tag -a v1.0 -m "Release 1.0"
git push origin v1.0
```

To create a GitHub release from the pushed tag you can either use the web UI (Releases -> Draft a new release) or the GitHub CLI:

```bash
gh release create v1.0 --title "v1.0" --notes "Initial release"
```

Also see `CHANGELOG.md` for the release notes.