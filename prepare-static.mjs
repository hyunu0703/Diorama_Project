import { mkdirSync, cpSync } from 'node:fs';
mkdirSync('dist', { recursive: true });
for (const file of ['index.html','style.css','main.js','realm-background.js','three.module.js','chess-models.js','celestial-gems.js','chess-interaction.js','chess-rules.js','chess-animation.js','assets','vendor']) {
  cpSync(file, `dist/${file}`, { recursive: true });
}
