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