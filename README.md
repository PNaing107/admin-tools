# CSV Editor

A simple browser-based CSV editor built with React. Upload a CSV file, edit cells in a spreadsheet-like table, and download the result — no backend required.

**Live site:** [https://pnang107.github.io/admin-tools/](https://pnang107.github.io/admin-tools/)

## Features

- Upload `.csv` files from your device
- Edit cell values inline
- Add or remove rows and columns
- Download the edited file
- Start from a blank sheet

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:5173/admin-tools/](http://localhost:5173/admin-tools/) in your browser.

## Build

```bash
npm run build
```

Output is written to the `dist/` folder.

## Deploy to GitHub Pages

This repo includes a GitHub Actions workflow that deploys automatically on push to `main`.

You can also deploy manually:

```bash
npm run deploy
```

Then enable GitHub Pages in your repository settings and set the source to the `gh-pages` branch.

## Tech stack

- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/)
- [Papa Parse](https://www.papaparse.com/) for CSV parsing
