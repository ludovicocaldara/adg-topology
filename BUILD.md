# Build & Run Instructions for ADG Topology Designer

This guide explains how to set up the project locally, run it in development mode, and build a production version.

## Prerequisites

- **Node.js** (v20 or later) – includes npm
- **Git** – to clone the repository
- A modern web browser (Chrome, Firefox, Edge, Safari)

## 1️⃣ Clone the Repository

```bash
git clone https://github.com/ludovicocaldara/adg-topology.git
cd adg-topology
```

## 2️⃣ Install Dependencies

```bash
npm install
```

> This installs all required packages listed in `package.json`, including React, Vite, and `@xyflow/react`.

## 3️⃣ Run the Development Server

```bash
npm run dev
```

- Vite starts a hot‑reloading development server.
- Open the URL shown in the terminal (usually `http://localhost:5173`) in your browser.
- Any changes you make to the source files will automatically refresh the page.

## 4️⃣ Build for Production

When you’re ready to create a static bundle for deployment:

```bash
npm run build
```

- The compiled assets are placed in the `dist/` directory.
- You can serve this folder with any static web server (e.g., `npx serve dist`).

## 5️⃣ Preview the Production Build (Optional)

```bash
npm run preview
```

- Starts a local server that serves the contents of `dist/` so you can verify the production build.

## 6️⃣ Linting & Formatting (Optional)

```bash
npm run lint      # Run ESLint
npm run format    # Run Prettier
```

## 7️⃣ Clean Up

If you need to reset the environment:

```bash
rm -rf node_modules
npm install
```

## 📦 Scripts Overview (from `package.json`)

| Script   | Description                                 |
|----------|---------------------------------------------|
| `dev`    | Start Vite development server (hot reload) |
| `build`  | Create an optimized production build        |
| `preview`| Preview the production build locally        |
| `lint`   | Run ESLint for code quality checks          |
| `format` | Run Prettier to format the codebase         |

---

You’re now ready to develop, test, and deploy the ADG Topology Designer locally. Happy coding!
