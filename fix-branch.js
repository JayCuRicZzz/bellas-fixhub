var fs = require('fs');
var page = fs.readFileSync('app/dashboard/admin/pm/page.tsx','utf8');
page = page.replace("useState('BVP1')", "useState('BV')");
fs.writeFileSync('app/dashboard/admin/pm/page.tsx', page, 'utf8');
console.log('Fixed');
