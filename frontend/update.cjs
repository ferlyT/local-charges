const fs = require('fs');
const file = 'c:/project-vibe-coding/local-charges/frontend/src/pages/FormPage.tsx';
let data = fs.readFileSync(file, 'utf8');

data = data.replace(
  /<h1 className="text-\[1\.5rem\] font-bold text-primary tracking-\[-0\.02em\]">/g,
  '<h1 className="text-[2.5rem] font-display text-primary tracking-[-0.015em]">'
);

data = data.replace(
  /label className="block text-\[0\.72rem\] tracking-\[0\.02em\] font-medium text-secondary uppercase mb-1"/g,
  'label className="block text-primary text-[0.75rem] tracking-[0.04em] font-mono mb-1 uppercase"'
);

fs.writeFileSync(file, data);
console.log('done');
