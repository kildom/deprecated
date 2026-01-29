
import * as fs from 'fs';
import { cre } from 'con-reg-exp';
import { start } from 'repl';
import { resolve } from 'path';
import { interfaces, enums, OrType, Type, SimpleType, ArrayType, ComplexType, ObjectType, InterfaceDeclaration } from './structure';
import { applyFixups } from './fixups';

const LINKS_COMMIT = '96fee942ecc2b3b9d3c34163ec142b75daf4cca1';

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
    'es2025.md',
    'es2026.md',
];


const CODE_BLOCK_RE = cre.global`
    {
        start-of-line
        "\`\`\`"
        repeat word-character
        lazy-repeat white-space
        end-of-line

        code: lazy-repeat any

        start-of-line
        "\`\`\`"
        lazy-repeat white-space
        end-of-line
    } or {
        start-of-line
        at-least-1 "#"
        at-least-1 white-space
        section: repeat not term
    }
`;

const DECLARATION_RE = cre.global`
    optional extend: "extend"
    repeat white-space
    kind: ("interface" or "enum")
    at-least-1 white-space
    name: at-least-1 word-character
    repeat white-space
    optional {
        "<:"
        inheritance: lazy-repeat any
    }
    "{"
    body: lazy-repeat {
        {
            "{", repeat any, "}"
        } or {
            not "{"
        }
    }
    "}"
`;

const FIELD_RE = cre.global`
    name: at-least-1 word-character
    repeat white-space
    ":"
    repeat white-space
    type: repeat {
        {
            "{", repeat not "{", "}"
        } or {
            not [;{]
        }
    }
    ";"
`;

const TYPE_RE = cre.sticky`
    repeat white-space
    simple: {
        'null' or
        'true' or
        'false' or
        'boolean' or
        'string' or
        'number' or
        'bigint' or
        'RegExp' or
        ('"', repeat not '"', '"')
    } or {
        '['
        array: repeat not [[\]]
        ']'
    } or type: {
        [A-Z], repeat word-character
    } or {
        '{'
        object: repeat not [{}]
        '}'
    }
    repeat white-space
    optional or: "|"
`;

interface TypeMatch {
    simple: string | undefined;
    array: string | undefined;
    type: string | undefined;
    object: string | undefined;
    or: string | undefined;
};

interface FieldMatch {
    name: string;
    type: string;
};

interface DeclarationMatch {
    extend: 'extend' | undefined;
    kind: 'interface' | 'enum';
    name: string;
    inheritance: string | undefined;
    body: string;
}


function parseType(typeStr: string): Type {
    let re = new RegExp(TYPE_RE);
    let match;
    let remaining = typeStr;
    let types: Type[] = [];
    while ((match = re.exec(typeStr)) !== null) {
        let groups = match.groups as unknown as TypeMatch;
        if (groups.simple) {
            types.push(new SimpleType(groups.simple));
        } else if (groups.array) {
            types.push(new ArrayType(parseType(groups.array)));
        } else if (groups.type) {
            types.push(new ComplexType(groups.type));
        } else if (groups.object) {
            types.push(new ObjectType(parseInterfaceBody(groups.object)));
        }
        //console.log(groups);
        remaining = typeStr.substring(re.lastIndex).trim();
        if (!groups.or) {
            break;
        }
    }
    if (remaining) {
        throw new Error('Unparsed type:\n' + remaining + '\nAT:' + typeStr);
    }
    if (types.length == 1) {
        return types[0];
    } else if (types.length > 1) {
        return new OrType(types);
    } else {
        throw new Error('No type parsed:\n' + typeStr);
    }
}

function parseInterfaceBody(body: string) {
    body = body.trim();
    let fields: {[key: string]: Type} = Object.create(null);
    let remaining = body.replace(FIELD_RE, (...args: any[]) => {
        let match = args.at(-1) as unknown as FieldMatch;
        let fieldName = match.name.trim();
        let typeStr = match.type.trim();
        let type = parseType(typeStr);
        fields[fieldName] = type;
        return '';
    });
    remaining = remaining.trim();
    if (remaining) {
        throw new Error('Unparsed interface body:\n' + remaining + '\nAT:' + body);
    }
    return fields;
}

function parseInterface(match: DeclarationMatch, file: string, section: string) {
    let name = match.name.trim();
    let body = match.body.trim();
    let inheritance = (match.inheritance ?? '').trim();
    let inheritanceList: string[] = [];
    if (inheritance) {
        inheritanceList = inheritance.split(',').map(x => x.trim());
    }
    let fields = parseInterfaceBody(body);
    let intf: InterfaceDeclaration;
    if (match.extend) {
        if (!interfaces[name]) {
            console.log(`Missing interface to extend: ${name}`);
            process.exit();
        }
        intf = interfaces[name];
    } else {
        if (interfaces[name]) {
            console.log(`Duplicate interface declaration: ${name}`);
            process.exit();
        }
        intf = new InterfaceDeclaration(name);
        interfaces[name] = intf;
    }
    intf.links.push(`https://github.com/estree/estree/blob/${LINKS_COMMIT}/${file}${section}`);
    intf.extend(inheritanceList, fields);
    //console.log(`${name} <: `, inheritanceList, fields);
    //console.log(`Interface ${name} not implemented yet: ${body}`);
    //throw new Error('Function not implemented.');
}

function parseEnum(match: DeclarationMatch) {
    let name = match.name.trim();
    let body = match.body.trim().replace(cre`(begin-of-text, '"') or ('"', end-of-text)`, '');
    let items = body
        .split(cre`'"', repeat white-space, '|', repeat white-space, '"'`)
        .map(x => x.replace(/"/g, '').trim());
    let extend = !!match.extend;
    let enumItems: string[];
    if (extend) {
        enumItems = enums[name];
    } else {
        enumItems = [];
        enums[name] = enumItems;
    }
    enumItems.push(...items);
}

function parseDeclaration(match: DeclarationMatch, file: string, section: string) {
    match.body = match.body.replace(/\/\/.*$/gm, '').trim();
    if (match.kind === 'interface') {
        parseInterface(match, file, section);
    } else if (match.kind === 'enum') {
        parseEnum(match);
    } else {
        throw new Error('Unknown declaration kind: ' + match.kind + '\nAT:' + match.body);
    }
}

function getAncestors(intf: InterfaceDeclaration, result: Set<InterfaceDeclaration>[], level: number = 0) {
    for (let parent of intf.superclasses) {
        result[level] = result[level] ?? new Set<InterfaceDeclaration>();
        result[level].add(parent);
        getAncestors(parent, result, level + 1);
    }
}

function getDescendants(intf: InterfaceDeclaration, result: Set<InterfaceDeclaration>) {
    for (let child of intf.subclasses) {
        result.add(child);
        getDescendants(child, result);
    }
}

function resolveInheritance()
{
    for (let intf of Object.values(interfaces)) {
        for (let superName of intf.superclassesStr) {
            let superIntf = interfaces[superName];
            intf.superclasses.push(superIntf);
            superIntf.subclasses.push(intf);
        }
    }

    for (let intf of Object.values(interfaces)) {
        intf.superclasses = [...new Set(intf.superclasses)];
        if (intf.superclasses.filter(s => s.kind === 'class').length > 1) {
            throw new Error(`Interface ${intf.name} has multiple class superclasses.`);
        }
        intf.subclasses = [...new Set(intf.subclasses)];
        let byLevels: Set<InterfaceDeclaration>[] = [];
        getAncestors(intf, byLevels, 0);
        intf.ancestors = byLevels.flatMap(set => [...set]);
        loopTop:
        for (let ancestors of byLevels) {
            for (let ancestor of ancestors) {
                if (ancestor.kind !== 'interface') {
                    intf.nonIntfSuperclass = ancestor;
                    break loopTop;
                }
            }
        }
        let all = new Set<InterfaceDeclaration>();
        getDescendants(intf, all);
        intf.descendants = [...all];
    }

}

function resolveTypeField(intf: InterfaceDeclaration)
{
    if (intf.type) {
        return intf.type;
    }
    if (intf.fields.type) {
        let typeField = intf.fields.type;
        delete intf.fields.type;
        if (!(typeField instanceof SimpleType)) {
            throw new Error('Interface type field must be a simple type.');
        }
        intf.type = typeField.name.replace(/"/g, '');
    } else {
        for (let ancestor of intf.ancestors) {
            intf.type = resolveTypeField(ancestor);
            if (intf.type) {
                break;
            }
        }
    }
    return intf.type;
}

function resolveAllTypesField(intf: InterfaceDeclaration)
{
    if (intf.allTypes.length > 0) {
        return;
    }
    let allTypes: string[] = [];
    if (intf.type) {
        allTypes.push(intf.type);
    }
    for (let desc of intf.descendants) {
        resolveAllTypesField(desc);
        allTypes.push(...desc.allTypes);
    }
    intf.allTypes = [...new Set(allTypes)];
}

function resolveInheritedFields(intf: InterfaceDeclaration)
{
    for (let parent of intf.superclasses) {
        resolveInheritedFields(parent);
        intf.fields = { ...parent.fields, ...intf.fields };
    }
}

export function parse() {

    for (let file of files) {
        let section = '';
        let text = fs.readFileSync(`ext/estree/${file}`, 'utf-8');
        let re = new RegExp(CODE_BLOCK_RE);
        // Loop over all occurrences of `re` in text
        let match;
        while ((match = re.exec(text)) !== null) {
            if (match.groups?.code) {
                const code = match.groups.code;
                // console.log('--- CODE BLOCK ---');
                // console.log(code);
                let remaining = code.replace(DECLARATION_RE, (...args: any[]) => {
                    parseDeclaration(args.at(-1) as unknown as DeclarationMatch, file, section);
                    return '';
                });
                remaining = remaining.trim();
                if (remaining && !remaining.startsWith('//')) {
                    throw new Error('Unparsed code:\n' + remaining + '\nAT:' + code);
                }
            } else {
                let title = match.groups!.section!.trim();
                section = '#' + title.replace(/ /g, '-').toLowerCase();
            }
        }
    }

    applyFixups();

    resolveInheritance();

    for (let intf of Object.values(interfaces)) {
        resolveTypeField(intf);
    }

    for (let intf of Object.values(interfaces)) {
        resolveAllTypesField(intf);
    }

    for (let intf of Object.values(interfaces)) {
        resolveInheritedFields(intf);
    }

    resolveOwnership();
}

function resolveOwnership() {

    // Collect just direct components
    for (let intf of Object.values(interfaces)) {
        for (let type of Object.values(intf.fields)) {
            intf.components.push(...collectComponentsOfType(type));
        }
        intf.components = [...new Set(intf.components)];
    }

    // Collect containers
    for (let intf of Object.values(interfaces)) {
        for (let component of intf.components) {
            let descendants = [component, ...component.descendants];
            let allComponents: InterfaceDeclaration[] = [...descendants];
            for (let comp of descendants) {
                allComponents.push(...comp.ancestors);
            }
            for (let comp of allComponents) {
                comp.containers.push(intf);
            }
        }
    }

    for (let intf of Object.values(interfaces)) {
        intf.containers = [...new Set(intf.containers)];
    }

    // Collect indirect (caused by inheritance) components
    for (let intf of Object.values(interfaces)) {
        collectIndirectComponentsOfIntf(intf);
    }
}

function collectIndirectComponentsOfIntf(intf: InterfaceDeclaration) {
    for (let subclass of intf.subclasses) {
        collectIndirectComponentsOfIntf(subclass);
        intf.components.push(...subclass.components);
    }
    intf.components = [...new Set(intf.components)];
}

function collectIndirectContainersOfIntf(intf: InterfaceDeclaration) {
    for (let subclass of intf.subclasses) {
        collectIndirectContainersOfIntf(subclass);
        intf.containers.push(...subclass.containers);
    }
    intf.containers = [...new Set(intf.containers)];
}

function collectComponentsOfType(type: Type) {
    if (type instanceof SimpleType) {
        // no components
    } else if (type instanceof ArrayType) {
        type.components = [...collectComponentsOfType(type.type)];
    } else if (type instanceof ComplexType) {
        if (!type.intf && !type.enumName) {
            if (interfaces[type.name]) {
                type.intf = interfaces[type.name];
            } else if (enums[type.name]) {
                type.enumName = type.name;
                type.enumItems = enums[type.name];
            } else {
                throw new Error('Unknown type: ' + type.name);
            }
        }
        if (type.intf) {
            type.components.push(type.intf);
            if (type.intf.name === 'Node') {
                throw new Error('Node cannot be a component type.');
            }
        }
    } else if (type instanceof OrType) {
        for (let subtype of type.types) {
            type.components.push(...collectComponentsOfType(subtype));
        }
    } else if (type instanceof ObjectType) {
        for (let fieldType of Object.values(type.fields)) {
            type.components.push(...collectComponentsOfType(fieldType));
        }
    } else {
        throw new Error('Unknown type kind in collectComponentsOfType.');
    }
    type.components = [...new Set(type.components)];
    return type.components;
}

