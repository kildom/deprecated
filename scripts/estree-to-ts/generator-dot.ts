
import * as fs from 'node:fs';
import { InterfaceDeclaration, interfaces } from './structure';

export function generateInheritanceDot() {

    let graph = 'digraph G {\n';
    graph += '    rankdir="LR";\n';
    for (let intf of [...new Set(Object.values(interfaces))]) {

        if (intf.name === 'Node') {
            continue;
        }

        graph += `    "${intf.name}" [`;
        graph += ` label=<${intf.name}`;
        if (intf.nonIntfSuperclass && intf.superclasses.indexOf(intf.nonIntfSuperclass) < 0 && intf.nonIntfSuperclass?.name !== 'Node') {
            graph += ` <br/><font point-size="10" color="blue">--&gt; ${intf.nonIntfSuperclass!.name}</font>`;
        }
        if (!intf.type) {
            graph += ` <br/><font point-size="10" color="gray">[unnamed]</font>`;
        } else if (intf.type !== intf.name) {
            graph += ` <br/><font point-size="10" color="gray">${intf.type}</font>`;
        }

        if (intf.condition) {
            graph += `<br/><font point-size="10" color="red">if ${intf.condition.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</font>`;
        }
        graph += `>`;
        if (intf.kind === 'interface') {
            graph += ' style=filled fillcolor="#f2f2f2ff" color="#bababaff" fontcolor="#444444"';
        }
        graph += ` ];\n`;
        for (let superIntf of intf.superclasses) {
            if (superIntf.name === 'Node') {
                continue;
            }
            graph += `    "${intf.name}" -> "${superIntf.name}"`;
            if (superIntf.kind === 'interface' || intf.kind === 'interface') {
                graph += ' [ style=dashed color="#CCCCCC" ]';
            }
            graph += `;\n`;
        }
    }
    graph += '}\n';

    fs.mkdirSync('tmp/dot', { recursive: true });
    fs.writeFileSync('tmp/dot/estree-structure.dot', graph);

}

function parentOwnership(intf: InterfaceDeclaration): string {
    let graph = '';

    for (let container of new Set(Object.values(interfaces))) {
        if (container.components.indexOf(intf) < 0) {
            continue;
        }
        let fieldNames: string[] = [];
        for (let [fieldName, fieldType] of Object.entries(container.fields)) {
            if (fieldType.components.indexOf(intf) < 0) {
                continue;
            }
            fieldNames.push(fieldName);
        }
        if (fieldNames.length > 0) {
            graph += `    "${container.name}" -> "${intf.name}" [label="${fieldNames.join(', ')}"]\n`;
        }
    }

    for (let superIntf of intf.superclasses) {
        if (superIntf.name === 'Node') {
            continue;
        }
        graph += `    "${superIntf.name}" -> "${intf.name}" [color="red"]\n`;
        graph += parentOwnership(superIntf);
    }

    return graph;
}

function generateOwnershipFor(intf: InterfaceDeclaration) {
    let graph = 'digraph G {\n';
    graph += '    rankdir="LR";\n';

    graph += `    "${intf.name}" [label=<<b>${intf.name}</b>> style=filled fillcolor="#a87070ff" color="#681414ff" ];\n`;

    let byIntf = new Map<InterfaceDeclaration, string[]>();
    for (let [fieldName, fieldType] of Object.entries(intf.fields)) {
        for (let compIntf of fieldType.components) {
            if (compIntf.name === 'Node' || compIntf.name === intf.name) {
                continue;
            }
            byIntf.set(compIntf, [...(byIntf.get(compIntf) ?? []), fieldName]);
        }
    }
    for (let [compIntf, fieldNames] of byIntf.entries()) {
        graph += `    "${intf.name}" -> "${compIntf.name}" [ label="${fieldNames.join(', ')}" fontcolor="#888888" color="#888888" ];\n`;
        for (let sub of compIntf.subclasses) {
            if (sub.name === 'Node') {
                continue;
            }
            graph += `    "${compIntf.name}" -> "${sub.name}" [ color="#2261afff" ];\n`;        
        }
    }

    graph += parentOwnership(intf);

    graph += '}\n';

    fs.mkdirSync('tmp/dot', { recursive: true });
    fs.writeFileSync(`tmp/dot/${intf.name}.dot`, graph);
}

export function generateOwnershipDot() {
    let graph = 'digraph G {\n';
    graph += '    rankdir="LR";\n';

    for (let intf of [...new Set(Object.values(interfaces))]) {

        if (intf.name === 'Node') {
            continue;
        }

        graph += `    "${intf.name}" [`;
        graph += ` label=<${intf.name}`;
        graph += `>`;
        if (intf.kind === 'interface') {
            graph += ' style=filled fillcolor="#f2f2f2" color="#bababaff" fontcolor="#444444"';
        }
        graph += ` ];\n`;

        let byIntf = new Map<InterfaceDeclaration, string[]>();
        for (let [fieldName, fieldType] of Object.entries(intf.fields)) {
            for (let compIntf of fieldType.components) {
                if (compIntf.name === 'Node' || compIntf.name === intf.name) {
                    continue;
                }
                byIntf.set(compIntf, [...(byIntf.get(compIntf) ?? []), fieldName]);
            }
        }
        for (let [compIntf, fieldNames] of byIntf.entries()) {
            graph += `    "${intf.name}" -> "${compIntf.name}" [ label="${fieldNames.join(', ')}" fontcolor="#888888" color="#888888" ];\n`;
        }

        for (let sub of intf.subclasses) {
            if (sub.name === 'Node') {
                continue;
            }
            graph += `    "${intf.name}" -> "${sub.name}" [ color="#CCCCCC" ];\n`;
        }
        generateOwnershipFor(intf);
    }
    graph += '}\n';

    fs.mkdirSync('tmp/dot', { recursive: true });
    fs.writeFileSync('tmp/dot/estree-ownership.dot', graph);

}
