const fs = require('fs');
const path = require('path');

const directories = ['public/generated', 'temp'];

for (const dir of directories) {
  fs.mkdirSync(dir, { recursive: true });
  for (const name of fs.readdirSync(dir)) {
    if (name === '.gitkeep') continue;
    fs.rmSync(path.join(dir, name), { recursive: true, force: true });
  }
}
