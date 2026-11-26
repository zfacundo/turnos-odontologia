const { cpSync, existsSync, mkdirSync, rmSync } = require('node:fs');
const path = require('node:path');

const raiz = path.join(__dirname, '..');
const origen = path.join(raiz, 'public');
const destino = path.join(raiz, 'dist', 'public');

if (!existsSync(origen)) throw new Error(`No existe ${origen}`);
mkdirSync(path.dirname(destino), { recursive: true });
rmSync(destino, { recursive: true, force: true });
cpSync(origen, destino, { recursive: true });
