var fs = require('fs');
var page = fs.readFileSync('app/dashboard/admin/pm/page.tsx','utf8');

var fixes = [
  ['bg-white', 'bg-navy-800'],
  ['bg-gray-50', 'bg-navy-700'],
  ['text-gray-500', 'text-gray-300'],
  ['text-gray-800', 'text-white'],
  ['text-gray-700', 'text-gray-200'],
  ['text-gray-400', 'text-gray-400'],
];
fixes.forEach(function(pair) {
  while (page.indexOf(pair[0]) !== -1) {
    page = page.replace(pair[0], pair[1]);
  }
});

// Fix input border
page = page.split('w-full border rounded-lg px-3 py-2').join('w-full border-navy-600 rounded-lg px-3 py-2 bg-navy-700 text-gray-200');

// Fix select
page = page.split('border rounded-lg px-3 py-2').join('border border-navy-600 rounded-lg px-3 py-2 bg-navy-700 text-white');

// Fix table classes
page = page.split('bg-white rounded-xl shadow overflow-hidden').join('bg-navy-800 rounded-xl shadow overflow-hidden');
page = page.split('border-t hover:bg-gray-50').join('border-t border-navy-600 hover:bg-navy-700');

// Fix alerts
page = page.split('bg-red-50 text-red-800').join('bg-red-900/30 text-red-300');
page = page.split('bg-green-50 text-green-800').join('bg-green-900/30 text-green-300');

// Fix cancel button
page = page.split('bg-gray-200 rounded-lg hover:bg-gray-300').join('bg-navy-600 text-gray-200 rounded-lg hover:bg-navy-500');

// Add text color to labels
page = page.split('text-sm font-medium mb-1">').join('text-sm font-medium mb-1 text-gray-300">');

fs.writeFileSync('app/dashboard/admin/pm/page.tsx', page, 'utf8');
console.log('Dark theme applied');

// Same for PM calendar page
var pmPage = fs.readFileSync('app/dashboard/pm/page.tsx','utf8');
pmPage = pmPage.split('bg-white').join('bg-navy-800');
pmPage = pmPage.split('text-gray-500').join('text-gray-300');
pmPage = pmPage.split('text-gray-600').join('text-gray-300');
pmPage = pmPage.split('text-gray-400').join('text-gray-500');
pmPage = pmPage.split('bg-gray-100').join('bg-navy-700');
pmPage = pmPage.split('text-gray-700').join('text-gray-200');
pmPage = pmPage.split('bg-red-100').join('bg-red-900/40');
pmPage = pmPage.split('text-red-700').join('text-red-300');
fs.writeFileSync('app/dashboard/pm/page.tsx', pmPage, 'utf8');
console.log('PM calendar dark theme');
