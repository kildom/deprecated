
import fs from 'node:fs';

let file = fs.readFileSync(process.argv[2]);
let newName = process.argv[3].split('.');
if (newName.length !== 2 || newName[0].length !== 3 || newName[1].length !== 6) {
    console.error('Invalid import format. Expected 3 letters for module and 6 for name.');
    process.exit(1);
}
let text = [...file].map(c => String.fromCharCode(c)).join('');
let textOut = text.replace('\x03env\x06memory\x02', `\x03${newName[0]}\x06${newName[1]}\x02`);
fs.writeFileSync(process.argv[2], new Uint8Array([...textOut].map(c => c.charCodeAt(0))));
