var fs = require('fs');
var s = fs.readFileSync('app/api/setup/route.ts','utf8');
s = s.split("'BVP1'").join("'BV'");
fs.writeFileSync('app/api/setup/route.ts', s, 'utf8');
console.log('setup branch fixed to BV');
