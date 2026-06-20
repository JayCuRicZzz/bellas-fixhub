var fs = require('fs');
var layout = fs.readFileSync('app/layout.tsx','utf8');
layout = layout.split('icon-192.png').join('logo.jpg');
fs.writeFileSync('app/layout.tsx', layout, 'utf8');
console.log('Favicon updated to logo.jpg');
