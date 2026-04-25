const fs = require('fs');
const path = require('path');

const dir = __dirname;
const appCode = fs.readFileSync(path.join(dir, 'app.jsx'), 'utf8');

// Read current index.html and check what's there
const currentHtml = fs.existsSync(path.join(dir, 'index.html'))
  ? fs.readFileSync(path.join(dir, 'index.html'), 'utf8')
  : '';

const lineCount = currentHtml.split('\n').length;
console.log(`Current index.html: ${lineCount} lines`);
console.log(`app.jsx: ${appCode.split('\n').length} lines`);

// Build fresh clean index.html with app.jsx inlined
const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>The Tuscarora Club - Reservations</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"><\/script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"><\/script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
  <style>
    body{margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
    @media print{nav,.bg-emerald-900,button:not(.print-keep),.no-print{display:none!important}main,.max-w-7xl,body,.min-h-screen{padding:0!important;margin:0!important;max-width:none!important;width:100%!important;background:white!important}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}.shadow-sm,.shadow-md,.shadow-lg{box-shadow:none!important;border:1px solid #e5e7eb!important}}
  </style>
</head>
<body>
  <div id="root"></div>
  <script src="https://unpkg.com/lucide@latest"><\/script>
  <script type="text/babel">
${appCode}
  <\/script>
</body>
</html>`;

const outPath = path.join(dir, 'index.html');
fs.writeFileSync(outPath, html, 'utf8');

const sizeKB = (fs.statSync(outPath).size / 1024).toFixed(1);
const lines = html.split('\n').length;
console.log(`\n✅ SUCCESS! index.html rebuilt:`);
console.log(`   Size: ${sizeKB} KB`);
console.log(`   Lines: ${lines}`);
console.log(`\nNow open index.html in your browser and press Ctrl+Shift+R to hard-refresh.`);
