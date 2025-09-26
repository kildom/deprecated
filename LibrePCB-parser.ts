

type Guid = `${string}-${string}-${string}-${string}-${string}`;

function def(type: string) {
    return ['@default', type];
}

function list(type: any) {
    return ['@list', type];
}

function optional(type: any) {
    return ['@optional', type];
}

const schematicDesc = {
    librepcb_schematic: {
        guid_: def('guid'),
        name_: 'string',
        grid_: {
            interval: 'float',
            unit: 'name',
        },
        symbol_: list({
            guid_: def('guid'),
            component_: 'guid',
            lib_gate_: 'guid',
            position: ['float', 'float'],
            rotation: 'float',
            mirror_: 'bool',
            text_: list({
                guid_: def('guid'),
                layer: 'name',
                value_: 'string',
                align: ['name', 'name'],
                height: 'float',
                position: ['float', 'float'],
                rotation: 'float',
            }),
        }),
        netsegment_: list({
            guid_: def('guid'),
            net_: 'guid',
            junction_: list({
                guid: def('guid'),
                position: ['float', 'float'],
            }),
            line_: list({
                guid: def('guid'),
                width_: 'float',
                from_: {
                    junction: optional('guid'),
                    symbol: optional('guid'),
                    pin: optional('guid'),
                },
                to_: {
                    junction: optional('guid'),
                    symbol: optional('guid'),
                    pin: optional('guid'),
                },
            }),
            label_: list({
                guid_: def('guid'),
                position: ['float', 'float'],
                rotation: 'float',
                mirror: 'bool',
            }),
        }),
        polygon_: list({
            guid: def('guid'),
            layer_: 'name',
            width: 'float',
            fill: 'bool',
            grab_area: 'bool',
            vertex_: list({
                position: ['float', 'float'],
                angle: 'float',
            }),
        }),
        text_: list({
            guid: def('guid'),
            layer: 'name',
            value_: 'string',
            align: ['name', 'name'],
            height: 'float',
            position: ['float', 'float'],
            rotation: 'float',
        }),
    },
};

const circuitDesc = {
    librepcb_circuit: {
        variant_: list({
            guid: def('guid'),
            name_: 'string',
            description: 'string',
        }),
        netclass_: list({
            guid: def('guid'),
            name: 'string',
        }),
        net_: list({
            guid: def('guid'),
            auto: 'bool',
            name_: 'string',
            netclass: 'guid',
        }),
        component_: list({
            guid: def('guid'),
            lib_component_: 'guid',
            lib_variant_: 'guid',
            name: 'string',
            value_: 'string',
            lock_assembly_: 'bool',
            device_: list({
                guid_: def('guid'),
                variant: 'guid',
            }),
            attribute_: list({
                name: def('string'),
                type: 'name',
                unit: 'name',
                value: 'string',
            }),
            signal_: list({
                guid: def('guid'),
                net: 'name',
            }),
        }),
    }
}

type LPNode = {
    _: string[];
} & {
    [key: string]: LPNode[];
};

/* cre.sticky.ignoreCase`
    repeat [\r\n\t\v\f \xA0\uFEFF]
    begin: {
        "("
        repeat [\r\n\t\v\f \xA0\uFEFF]
        name: at-least-1 [a-z_]
    }
    or
    end: {
        ")"
    }
    or
    value: {
        {
            "\""
            lazy-repeat {
                ("\\", any) or any
            }
            "\""
        } or {
            at-least-1 [^)\r\n\t\v\f \xA0\uFEFF]
        }
    }
`;*/
const tokenRegExp = /[\r\n\t\v\f \xA0\uFEFF]*(?:(?<begin>\([\r\n\t\v\f \xA0\uFEFF]*(?<name>[a-z_]+))|(?<end>\))|(?<value>"(?:\\.|.)*?"|[^)\r\n\t\v\f \xA0\uFEFF]+))/isuy;

interface TokenRegExpGroups {
    begin?: string;
    end?: string;
    value?: string;
}

enum TokenType {
    Begin = "begin",
    End = "end",
    Value = "value",
}

function* tokenize(text: string): IterableIterator<[TokenType, string]> {
    let tokenRegex = new RegExp(tokenRegExp);
    let groups: TokenRegExpGroups | undefined;
    while ((groups = tokenRegex.exec(text)?.groups)) {
        if (groups.begin !== undefined) {
            yield [TokenType.Begin, groups.begin.substring(1).trim()];
        } else if (groups.end !== undefined) {
            yield [TokenType.End, ''];
        } else if (groups.value !== undefined) {
            yield [TokenType.Value, groups.value];
        }
    }
}

function parseRaw(tokens: IterableIterator<[TokenType, string]>, root: boolean): LPNode {

    let result: LPNode = { _: [] };

    while (true) {
        let token = tokens.next();
        if (token.done) {
            if (root) {
                return result;
            } else {
                throw new Error("Parsing error: Unexpected end of input");
            }
        }
        let [type, value] = token.value;
        if (type === TokenType.Begin) {
            result[value] ??= [];
            result[value].push(parseRaw(tokens, false));
        } else if (type === TokenType.End) {
            return result;
        } else if (type === TokenType.Value) {
            result._.push(value);
        }
    }
}

function assert(condition: boolean, message?: string): asserts condition {
    if (!condition) {
        throw new Error(message ?? "Assertion failed");
    }
}

function parsePrimitive(node: LPNode, desc: string): any {
    assert(node._.length === 1, 'Parsing error: Expected exactly one value for guid');
    let value = node._[0];
    switch (desc) {
        case 'guid': {
            assert(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value), 'Parsing error: Invalid GUID format: ' + value);
            return value;
        }
        case 'name': {
            return value;
        }
        case 'string': {
            assert(value.startsWith('"'), 'Parsing error: Expected string to start with ": ' + value);
            return value;
        }
        case 'float': {
            value = value.trim();
            assert(/-?(?:0|[1-9]\d*)(?:\.\d+)?(?:e[+-]?\d+)?/isu.test(value), 'Parsing error: Invalid float format: ' + value);
            return parseFloat(value);
        }
        case 'bool': {
            value = value.trim();
            assert(/true|false/i.test(value), 'Parsing error: Invalid boolean value: ' + value);
            return value.toLowerCase() === 'true';
        }
        default:
            throw new Error('Internal error: Unknown primitive type ' + desc);
    }
}

function parseNode(node: LPNode, desc: any): any {
    node = { ...node };
    let result = {};
    if (typeof desc === 'string') {
        return parsePrimitive(node, desc);
    } else if (Array.isArray(desc)) {
        console.log(node);
        assert(node._.length === desc.length, 'Parsing error: Expected array of length ' + desc.length + ', got ' + node._.length);
        return node._.map((v, i) => parsePrimitive({ _: [v] } as any, desc[i]));
    }
    for (let [key, type] of Object.entries(desc)) {
        let fieldName = key.replace(/^_/, '').replace(/_$/, '');
        let isOptional = false;
        let isList = false;
        let values = node[fieldName];
        delete node[fieldName];
        while (Array.isArray(type) && type[0][0] === '@') {
            if (type[0] === '@optional') {
                isOptional = true;
            } else if (type[0] === '@list') {
                isList = true;
                isOptional = true;
            } else if (type[0] === '@default') {
                values = node._.map(v => ({ _: [v] })) as any;
                delete node["_" as any];
            }
            type = type[1];
        }
        if (values === undefined || values.length === 0) {
            if (isOptional) {
                continue;
            } else {
                throw new Error(`Parsing error: Missing required field ${fieldName}`);
            }
        }
        if (isList) {
            result[fieldName] = values.map(v => parseNode(v, type));
        } else {
            result[fieldName] = parseNode(values[0], type);
        }
    }
    let remaining = Object.entries(node)
        .filter(([k, v]) => v && v.length > 0)
        .map(([k, v]) => k);
    if (remaining.length > 0) {
        throw new Error('Parsing error: Unknown fields: ' + remaining.join(', '));
    }
    return result;
}

export function parse<T>(text: string, desc: any): T {
    let tokens = tokenize(text);
    let node = parseRaw(tokens, true);
    return parseNode(node, desc);
}

import { readFileSync } from 'node:fs';

console.log(JSON.stringify(
    parse(readFileSync('../schematics/relay/schematic.lp', 'utf-8'), schematicDesc)
    , null, 2));


console.log(JSON.stringify(
    parse(readFileSync('../circuit/circuit.lp', 'utf-8'), circuitDesc)
    , null, 2));


