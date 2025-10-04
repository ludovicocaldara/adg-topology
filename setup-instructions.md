# Setup Instructions for ADG Topology Designer

## Prerequisites

- Node.js (version 18 or higher)
- npm (comes with Node.js)

## Installation

1. Clone or download the project files to your local machine.

2. Navigate to the project directory:
   ```
   cd adg-topology
   ```

3. Install the dependencies:
   ```
   npm install
   ```

## Running the Application

1. Start the development server:
   ```
   npm run dev
   ```

2. Open your web browser and go to `http://localhost:5173/`

## Building for Production

To build the application for production:

```
npm run build
```

The built files will be in the `dist/` directory. You can serve them using any static web server.

## Fonts

The application uses Oracle Sans font. If it's not available on your system, it falls back to Haas Unica. For better visual consistency, ensure Oracle Sans is installed or linked via CSS.

## Notes

- This is a frontend-only application; no backend server is required.
- All data is stored in the browser's memory and can be exported/imported as JSON.
