
import * as fs from 'fs';

const files = [
    'es5.md',
    'es2015.md',
    'es2016.md',
    'es2017.md',
    'es2018.md',
    'es2019.md',
    'es2020.md',
    'es2021.md',
    'es2022.md',
];

const skipInterfaces = [
    'Node',
    'SourceLocation',
    'Position',
];


class Interface {
    inheritance: string[];
    fields: { [name: string]: { type: string, version: string }[] };
    constructor(
        public name: string,
        inheritanceStr: string | undefined | null,
        body: string,
        public version: string) {
        this.fields = {};
        this.inheritance = inheritanceStr ? inheritanceStr.split(',').map(x => x.trim()) : [];
        for (let f of this.getFields(body)) {
            this.fields[f.name] = [{ type: f.type, version: version }];
        }
    }

    getFields(body: string): { name: string, type: string }[] {
        let result: { name: string, type: string }[] = [];
        let remaining = body.trim();
        while (remaining) {
            let m: RegExpMatchArray | null;
            if ((m = remaining.match(/^([^:]+)\s*:\s*\[([^\]\|]*(\|[^\]]*)?)\]\s*;/s))) {
                result.push({
                    name: m[1].trim(),
                    type: m[3] ? '(' + m[2].trim() + ')[]' : m[2].trim() + '[]',
                });
            } else if ((m = remaining.match(/^([^:]+)\s*:\s*(\{.*\})\s*;/s))) {
                result.push({
                    name: m[1].trim(),
                    type: m[2].trim().replace(/\s+/g, ' ').trim(),
                });
            } else if ((m = remaining.match(/^([^:]+)\s*:\s*(".+?"(?:\s*\|\s*".+?"\s*)*);/s))) {
                result.push({
                    name: m[1].trim(),
                    type: m[2].trim(),
                });
            } else if ((m = remaining.match(/^([^:]+)\s*:\s*(.+?(?:\s*\|\s*.+?\s*)*);/s))) {
                result.push({
                    name: m[1].trim(),
                    type: m[2].trim(),
                });
            } else {
                throw new Error();
            }
            remaining = remaining.substring(m[0].length).trim();
        }
        return result;
    }

    extend(inheritanceStr: string | undefined | null, body: string, version: string) {
        if (inheritanceStr) {
            let inheritance = inheritanceStr ? inheritanceStr.split(',').map(x => x.trim()) : [];
            let old = new Set<string>(this.inheritance);
            this.inheritance.push(...inheritance.filter(x => !old.has(x)).map(x => `${x} /* inherited since ${version} */`));
        }
        for (let f of this.getFields(body)) {
            if (this.fields[f.name]) {
                if (!this.fields[f.name].find(x => x.type == f.type)) {
                    this.fields[f.name].push({ type: f.type, version: version });
                }
            } else {
                this.fields[f.name] = [{ type: f.type, version: version }];
            }
        }
    }

    generate(): string {
        let out = '';
        let version = this.version ? `    // since ${this.version}` : '';
        out += replaceTypes(`interface ${this.name} extends ${this.inheritance.join(', ')} {${version}\n`);
        for (let [name, versions] of Object.entries(this.fields)) {
            let previous = versions.slice(0, -1);
            let current = versions.slice(-1)[0];
            let version = current.version != this.version ? `    // since ${current.version}` : '';
            out += `    ${name}: ${replaceTypes(current.type)};${version}\n`;
            previous.reverse();
            for (let prev of previous) {
                let ns = ' '.repeat(name.length);
                let version = prev.version != this.version ? `    // since ${prev.version}` : '';
                out += `    //${ns}${replaceTypes(prev.type)};${version}\n`;
            }
        }
        out += '}\n';
        return out;
    }
}

class Enum {
    public content: { body: string, version: string }[];
    constructor(
        public name: string,
        body: string,
        public version: string) {
        this.content = [{ body: body.replace(/\s+/g, ' ').trim(), version }];
    }
    extend(body: string, version: string) {
        this.content.push({ body: body.replace(/\s+/g, ' ').trim(), version });
    }
    generate(): string {
        let out = '';
        let version = this.version ? `    // since ${this.version}` : '';
        out += `type ${this.name} = `;
        let parts: string[] = [];
        for (let c of this.content) {
            let version = c.version ? `/* since ${c.version}: */ ` : '';
            parts.push(`${version}${c.body}`);
        }
        out += parts.join(' | ');
        out += `;${version}\n`;
        return out;
    }
}

let interfaces: { [key: string]: Interface } = {};
let enums: { [key: string]: Enum } = {};

function parseFile(text: string, version: string): void {
    console.log(`Parsing standard version ${version}`);
    for (let m of text.matchAll(/```js\s+(.*?)```/igs)) {
        let codeBlocks = m[1].trim().replace(/\r/g, '').split('\n\n');
        for (let code of codeBlocks) {
            let mm;
            if ((mm = code.match(/^(extend\s+)?interface\s+(.+?)\s*(?:<:\s*(.+?)\s*)?\{(.*)\}\s*$/s))) {
                if (skipInterfaces.indexOf(mm[2]) >= 0) continue;
                if (mm[1]) {
                    if (!interfaces[mm[2]]) {
                        //console.log(Array.prototype.slice.call(mm, 0));
                        //console.log(Object.keys(interfaces));
                        console.log(`Missing interface to extend: ${mm[2]}`);
                        process.exit();
                    }
                    interfaces[mm[2]].extend(mm[3], mm[4], version);
                } else {
                    interfaces[mm[2]] = new Interface(mm[2], mm[3], mm[4], version);
                }
            } else if ((mm = code.match(/^(extend\s+)?enum\s+(.+?)\s*\{(.*)\}\s*$/ms))) {
                if (mm[1]) {
                    if (!enums[mm[2]]) {
                        //console.log(Array.prototype.slice.call(mm, 0));
                        //console.log(Object.keys(interfaces));
                        console.log(`Missing enum to extend: ${mm[2]}`);
                        process.exit();
                    }
                    enums[mm[2]].extend(mm[3], version);
                } else {
                    enums[mm[2]] = new Enum(mm[2], mm[3], version);
                }
            } else {
                console.log('--- UNKNOWN CODE ---');
                console.log(code);
                process.exit();
            }
        }
    }
}


for (let file of files) {
    let text = fs.readFileSync(`../ext/estree/${file}`, 'utf-8');
    let version = file.slice(0, -3);
    version = version == 'es5' ? '' : version.toUpperCase();
    parseFile(text, version);
}

function replaceTypes(text: string): string {
    return text;
    //.replace(interfaceReplacer, '$1Interface')
    //.replace(enumReplacer, '$1Enum');
}

let interfaceReplacer = new RegExp(`(?<!["A-Za-z0-9_])(${[...Object.keys(interfaces), ...skipInterfaces].join('|')})(?!["A-Za-z0-9_])`, 'g');
let enumReplacer = new RegExp(`(?<!["A-Za-z0-9_])(${[...Object.keys(enums), ...skipInterfaces].join('|')})(?!["A-Za-z0-9_])`, 'g');

let out = '\ninterface NodeInterface { }\n\n';

for (let e of Object.values(enums)) {
    out += e.generate();
    out += '\n';
}

for (let int of Object.values(interfaces)) {
    out += int.generate();
    out += '\n';
}

fs.writeFileSync('../tmp/estree.ts', out);
