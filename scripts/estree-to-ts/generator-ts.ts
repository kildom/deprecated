
import * as fs from 'node:fs';

import { ArrayType, ComplexType, InterfaceDeclaration, interfaces, ObjectType, OrType, SimpleType, Type } from "./structure";
import { cre } from 'con-reg-exp';

function generateImports(references: Set<string>, skip: string, prefix: string = './'): string {
    let code = '';
    let files: { [key: string]: Set<string> } = {};
    for (let ref of references) {
        let fileName = ref.replace(cre.global`
            {
                begin-of-text
                "Ast" or "is"
            } or {
                "Intf" or "Symbol"
                end-of-text
            }`, '');
        if (fileName !== skip) {
            files[fileName] = files[fileName] || new Set<string>();
            files[fileName].add(ref);
        }
    }
    for (let [fileName, refs] of Object.entries(files)) {
        code += `import { ${[...refs].join(', ')} } from "${prefix}${fileName}";\n`;
    }
    return code;
}

function generateType(type: Type, references: Set<string>, needsParens: boolean, indent: string): string {
    let code = '';
    if (type instanceof ComplexType) {
        if (type.intf) {
            code = `Ast${type.intf.name}`;
            references.add(code);
            needsParens = false;
        } else if (type.enumItems) {
            let lines = [''];
            for (let item of type.enumItems) {
                let part = ` | "${item}"`;
                if (lines.at(-1)!.length + part.length > 70) {
                    lines.push(indent + '   ');
                }
                lines[lines.length - 1] += part;
            }
            let enumCode = lines.join('\n');
            if (lines.length > 1) {
                code += `\n${indent}   ${enumCode}`;
            } else {
                code += enumCode.trim().replace(cre`begin-of-text, repeat (whitespace or "|")`, '');
            }
        }
    } else if (type instanceof ObjectType) {
        code += '{\n';
        code += generateFields(references, type.fields, indent + '    ', '');
        code += indent + '}';
        needsParens = false;
    } else if (type instanceof ArrayType) {
        code += generateType(type.type, references, true, indent) + '[]';
        needsParens = false;
    } else if (type instanceof OrType) {
        code += type.types.map(t => generateType(t, references, true, indent)).join(' | ');
    } else if (type instanceof SimpleType) {
        code += type.name;
        needsParens = false;
    }
    if (needsParens) {
        code = '(' + code + ')';
    }
    return code;
}

function generateFields(references: Set<string>, fields: { [key: string]: Type }, indent: string, prefix: string): string {
    let text = '';
    for (let fieldName of Object.keys(fields)) {
        let fieldType = fields[fieldName];
        text += `${indent}${prefix}${fieldName}: ${generateType(fieldType, references, false, indent)};\n`;
    }
    return text;
}

function generateClass(intf: InterfaceDeclaration) {
    let references = new Set<string>();
    let code = '';

    let helperReferences = new Set<string>();
    let helper = '';
    let helperImports: string[] = [];

    // Header
    code += `\nexport class Ast${intf.name}`;

    // Extends
    if (intf.nonIntfSuperclass) {
        code += ' extends Ast' + intf.nonIntfSuperclass.name;
        references.add('Ast' + intf.nonIntfSuperclass.name);
    }

    // Implements
    let implementsList = intf.superclasses
        .filter(x => x != intf.nonIntfSuperclass)
        .map(x => x.name);
    if (implementsList.length > 0) {
        code += ' implements ' + implementsList.map(x => `Ast${x}Intf`).join(', ');
        implementsList.forEach(x => references.add(`Ast${x}Intf`));
    }

    // Start of body
    code += ' {\n';

    // Links to documentation
    for (let link of intf.links) {
        code += `    // ${link}\n`;
    }

    if (intf.allTypes.length < 4) {
        code += `\n    declare type: "${intf.allTypes.join('" | "')}";\n`;
    } else {
        code += `\n    declare type:\n        | "${intf.allTypes.join('"\n        | "')}";\n`;
    }

    // Fields
    code += '\n' + generateFields(references, intf.fields, '    ', 'declare ');

    let containers = intf.containers.map(x => `Ast${x.name}`);
    if (containers.length === 0) {
        code += `\n    declare container: null;\n`;
    } else if (containers.length > 3) {
        if (intf.name === 'Node') {
            helper += `\nexport type Ast${intf.name}Containers = null | ${containers.join(' | ')};\n`;
        } else {
            helper += `\nexport type Ast${intf.name}Containers = ${containers.join(' | ')};\n`;
        }
        intf.containers.forEach(x => helperReferences.add(`Ast${x.name}`));
        helperImports.push(`Ast${intf.name}Containers`);
        code += `\n    declare container: Ast${intf.name}Containers;\n`;
    } else {
        code += `\n    declare container: ${containers.join(' | ')};\n`;
        intf.containers.forEach(x => references.add(`Ast${x.name}`));
    }

    let components = intf.components.map(x => `Ast${x.name}`);
    if (components.length === 0) {
        code += `\n    declare components: never[];\n`;
    } else if (components.length > 3) {
        helper += `\nexport type Ast${intf.name}Components = ${components.join(' | ')};\n`;
        intf.components.forEach(x => helperReferences.add(`Ast${x.name}`));
        helperImports.push(`Ast${intf.name}Components`);
        code += `\n    declare components: Ast${intf.name}Components[];\n`;
    } else {
        code += `\n    declare components: (${components.join(' | ')})[];\n`;
        intf.components.forEach(x => references.add(`Ast${x.name}`));
    }

    code += `\n

    // Interface detection property
    if (implementsList.length > 0) {
        code += '\n';
        for (let impl of implementsList) {
            code += `    [Ast${impl}Symbol]: true = true;\n`;
            references.add(`Ast${impl}Symbol`);
        }
    }

    // End of body
    code += '};\n';

    // Check function
    code += `\nexport function isAst${intf.name}(node: any): node is Ast${intf.name} {\n`;
    code += `    return node instanceof Ast${intf.name};\n`;
    code += `}\n`;

    if (helper.length > 0) {
        helper = generateImports(helperReferences, '', '../') + helper;
        helperImports = [...new Set(helperImports)];
        code = `import { ${helperImports.join(', ')} } from './helpers/${intf.name}Helper';\n` + code;
        fs.mkdirSync('tmp/ast/helpers', { recursive: true });
        fs.writeFileSync(`tmp/ast/helpers/${intf.name}Helper.ts`, helper);
    }

    code = generateImports(references, intf.name) + code;

    fs.mkdirSync('tmp/ast', { recursive: true });
    fs.writeFileSync(`tmp/ast/${intf.name}.ts`, code);
}

function generateInterface(intf: InterfaceDeclaration) {
    let references = new Set<string>();
    let code = '';

    // Header
    code += `\nexport interface Ast${intf.name}Intf`;

    // Start of body
    code += ' {\n';

    // Links to documentation
    for (let link of intf.links) {
        code += `    // ${link}\n`;
    }

    // Fields
    code += '\n' + generateFields(references, intf.fields, '    ', '');

    let containers = intf.containers.map(x => `Ast${x.name}`);
    code += `\n    container: ${containers.join(' | ')};\n`;
    intf.containers.forEach(x => references.add(`Ast${x.name}`));

    let components = intf.components.map(x => `Ast${x.name}`);
    code += `\n    components: (${components.join(' | ')})[];\n`;
    intf.components.forEach(x => references.add(`Ast${x.name}`));

    // Interface detection symbol
    code += `\n    [Ast${intf.name}Symbol]: true;\n`;

    // End of body
    code += '};\n';

    code += `\nexport type Ast${intf.name} =`;
    for (let subClass of intf.subclasses) {
        code += `\n    | Ast${subClass.name}`;
        references.add('Ast' + subClass.name);
    }

    // Check function
    code += `\n\nexport function isAst${intf.name}(node: any): node is Ast${intf.name}Intf {\n`;
    code += `    return node[Ast${intf.name}Symbol] === true;\n`;
    code += `}\n`;

    code += `\nexport const Ast${intf.name}Symbol = Symbol('Ast${intf.name}');\n`;

    code = generateImports(references, intf.name) + code;

    fs.mkdirSync('tmp/ast', { recursive: true });
    fs.writeFileSync(`tmp/ast/${intf.name}.ts`, code);
}

function generateTypeTable() {
    let references = new Set<string>();
    let code = '';

    code += `\nexport const typeTable: { [key: string]: [any, ((node: any, field: string) => boolean)?][] } = {\n`;

    let types: { [key: string]: [string, string?][] } = {};

    for (let intf of new Set(Object.values(interfaces))) {
        if (!intf.type) {
            continue;
        }
        if (intf.kind === 'interface') {
            throw new Error('Interface in type table: ' + intf.name);
        }
        types[intf.type] = types[intf.type] || [];
        types[intf.type].push([`Ast${intf.name}`, intf.condition]);
        references.add(`Ast${intf.name}`);
    }

    for (let [typeName, entries] of Object.entries(types)) {
        if (entries.length > 1) {
            code += `    "${typeName}": [\n`;
            entries.sort((a, b) => (a[1] ? 0 : 1) - (b[1] ? 0 : 1));
            for (let [className, condition] of entries) {
                if (condition) {
                    code += `        [${className}, (node, field) => (${condition})],\n`;
                } else {
                    code += `        [${className}],\n`;
                }
            }
            code += `    ],\n`;
        } else {
            code += `    "${typeName}": [[${entries[0][0]}]],\n`;
        }
    }

    code += '};'

    code = generateImports(references, '') + code;

    fs.mkdirSync('tmp/ast', { recursive: true });
    fs.writeFileSync(`tmp/ast/typeTable.ts`, code);
}

export function generateTs() {

    for (let intf of Object.values(interfaces)) {
        if (intf.kind === 'class') {
            generateClass(intf);
        } else {
            generateInterface(intf);
        }
    }

    generateTypeTable();
}
