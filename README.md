# Mini File Manager

A small file manager built with Node.js core modules, HTML, CSS, and browser JavaScript. It creates text files in the project's `data` directory, lists them, and lets you preview their contents.

## Run locally

1. Install [Node.js](https://nodejs.org/) if it is not already installed.
2. From this project directory, run:

   ```sh
   node server.js
   ```

3. Open <http://localhost:3000> in your browser.

Set the `PORT` environment variable to use another port.

## Features

- Create a text file without replacing a file that already exists.
- Browse and preview files in the `data` directory.
- Delete files after confirming the action.
- View basic Node.js and operating system information.
- Reject invalid file names and oversized JSON requests.

Files are stored directly in `data`, so this project is intended for local learning and use.
