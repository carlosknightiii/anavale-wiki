const fs   = require('fs');
const path = require('path');
// Character JSON is passed in via the CHARACTER_JSON env var
// (set from github.event.client_payload in the workflow)
const raw = process.env.CHARACTER_JSON;
if (!raw) {
  console.error('No CHARACTER_JSON env var set.');
  process.exit(1);
}
let entry;
try {
  // client_payload is wrapped in { data: "..." } to stay under GitHub's 10-property limit
  const outer = JSON.parse(raw);
  const inner = outer.data ? outer.data : raw;
  entry = JSON.parse(inner);
} catch (e) {
  console.error('Failed to parse CHARACTER_JSON:', e.message);
  process.exit(1);
}
// Sanitise: strip any keys that shouldn't be in the data file
delete entry._dispatched_at;
const filePath = path.join(process.cwd(), 'data', 'characters.js');
let content = fs.readFileSync(filePath, 'utf8');
// Duplicate check — by token or by name
if (entry.token && content.includes(entry.token)) {
  console.log('Duplicate token detected — skipping write.');
  process.exit(0);
}
// Find insertion point: last `];` in the file
const insertPoint = content.lastIndexOf('];');
if (insertPoint === -1) {
  console.error('Could not find closing ]; in characters.js');
  process.exit(1);
}
const hasEntries = content.slice(0, insertPoint).trim().slice(-1) !== '[';
const entryStr   = '\n  ' + JSON.stringify(entry, null, 2).split('\n').join('\n  ');
const newContent = content.slice(0, insertPoint)
  + (hasEntries ? ',\n' : '\n')
  + entryStr + '\n'
  + content.slice(insertPoint);
fs.writeFileSync(filePath, newContent, 'utf8');
console.log('Character written:', entry.name, '(' + entry.id + ')');
