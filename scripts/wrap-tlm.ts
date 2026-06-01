import { prepareGameSource } from '../src/lib/reactGameWrapper';
import fs from 'fs';
const src = fs.readFileSync('/tmp/turtle-lm.tsx', 'utf8');
fs.writeFileSync('/tmp/turtle-lm.html', prepareGameSource(src));
console.log('done', fs.statSync('/tmp/turtle-lm.html').size);
