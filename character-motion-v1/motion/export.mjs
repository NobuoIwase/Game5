import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {makeLibrary} from './rig.mjs';
const output=fileURLToPath(new URL('./poses.json',import.meta.url));
fs.writeFileSync(output,JSON.stringify(makeLibrary(),null,2)+'\n');
console.log(output);
