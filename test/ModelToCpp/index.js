const { Parser } = require('xml2js');
const fs = require('fs');
const zlib = require('zlib');
const { TextDecoder } = require('util');

function findAllRec(obj, cond, list) {
    if (cond(obj)) {
        list.push(obj);
        return list;
    }
    if (typeof (obj) == 'object') {
        if (obj instanceof Array) {
            for (let i = 0; i < obj.length; i++) {
                findAllRec(obj[i], cond, list);
            }
        } else {
            for (let i in obj) {
                findAllRec(obj[i], cond, list);
            }
        }
    }
    return list;
}

async function main() {

    // Read and parse
    let xml = fs.readFileSync('doc/TestModelDiagram.drawio');
    let parser = new Parser({});
    let json = await parser.parseStringPromise(xml);

    // Decompress if compressed
    try {
        let blob = findAllRec(json, (x) => ('diagram' in x && '_' in x.diagram[0]), [])[0].diagram[0]._;
        if (!blob) throw Error();
        blob = new Buffer(blob, 'base64');
        blob = zlib.inflateRawSync(blob);
        blob = new TextDecoder().decode(blob);
        blob = decodeURIComponent(blob);
        json = await parser.parseStringPromise(blob);
    } catch (ex) { }

    // Find and transform all texts
    let temp = {};
    let cells = findAllRec(json, (x) => (typeof (x) == 'object' && 'mxCell' in x), []) // find child arrays with mxCell
        .map(x => x.mxCell) // get mxCell from it
        .reduce((s, x) => s.concat(x), []) // join all arrays
        .filter(x => ('$' in x && 'value' in x.$ && x.$.value.trim().length > 0)) // remove all that do not have value attribute
        .map(x => x
            .$.value // get value attribute
            .replace(/<a [^>]*href="http: (.*?)".*?>(.*?)<\/a>/g, (x, d, n) => { temp[n] = d; return n; }) // strip html tags
            .replace(/<(br|p|div).*?>/g, ' ') // strip html tags
            .replace(/<.*?>/g, '') // strip html tags
            .replace(/&nbsp;/g, ' ') // replace special html chars
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/$/, ';') // make sure that semicolon is at the end
            .replace(/[\s\r\n\t]+/g, ' ') // remove all new line characters
            .replace(/[\s\r\n\t]*([;\{\}])[\s\r\n\t]*/g, '$1\n') // add new line after ; { } and remove whitespace around it
            .replace(/(;\n)+/g, ';\n') // remove duplicated new lines with ';'
            .trim()
            .replace(/$/g, () => { if (Object.keys(temp).length == 0) return ''; let t = '`' + JSON.stringify(temp); temp = {}; return t; })
        )
        .filter(x => !x.startsWith('#')) // remove comment texts that starts with '#'
        ;

    // Extract objects from text
    let objs = cells
        .filter(x => x.match(/^[a-z_\$0-9]+:/i)) // Filter only starting with 'name:'
        .map(x => { // convert text to object
            let m = x.match(/^([a-z_\$0-9]+):\s*([\s\S]*)$/mi); // split between name and code
            let info = {};
            let v = {};
            let c = m[2].replace(/\$([a-z_\$0-9]+):([a-z_\$0-9]+)/gi, (x, m, t) => { v[m] = t; return m; }); // extract identifiers $name:type
            c = c.replace(/\$([a-z_\$0-9]+)/gi, (x, m) => { if (!(m in v)) v[m] = 'num'; return m; }); // extract identifiers $name
            c = c.replace(/`(.*)/, (x, m) => { info = JSON.parse(m); return ''; });
            return { cls: m[1], name: m[1].toLowerCase(), code: c, vars: v, in: {}, conns: [], info: info };
        });

    // Add special in/out object
    objs.push({ cls: 'In', name: 'in', code: '', vars: {}, in: {}, conns: [], info: {} });
    objs.push({ cls: 'Out', name: 'out', code: '', vars: {}, in: {}, conns: [], info: {} });

    // Create map name => object
    let objMap = {};
    objs.forEach(x => (objMap[x.name] = x));

    // Convert: x' = ...
    objs.forEach(x => {
        x.code = x.code.replace(/([a-z_\$0-9]+)'(.*);/ig, (m, id, rval) => {
            return `num ${id}_p${rval};\n${id} += ${id}_p * dt;`;
        });
    });

    // Convert: x in [? .. ?]
    objs.forEach(x => {
        x.code = x.code.replace(/([a-z_\$0-9]+)\s+in\s+\[(.+)\.\.(.+)\]/ig, (m, name, from, to) => {
            return `${name} = range(${name}, ${from}, ${to})`;
        });
    });

    // Extract connection from text
    let conns = cells
        .filter(x => !x.match(/^[a-z_$0-9]+:/i))
        .map(x => { let m = x.match(/^([a-z_\$0-9]+).([a-z_\$0-9]+)\s*=\s*([a-z_\$0-9]+).([a-z_\$0-9]+)/i); return { toObj: m[1], toVar: m[2], fromObj: m[3], fromVar: m[4], code: x }; });
    conns.forEach(x => {
        if (x.toVar in objMap[x.toObj].vars) throw Error(`The same state variable name and input ${x.toObj}.${x.toVar}!`);
        objMap[x.toObj].in[x.toVar] = 'num';
        if (objMap[x.toObj].name == 'out') objMap[x.toObj].vars[x.toVar] = 'num';
        objMap[x.fromObj].vars[x.fromVar] = 'num';
    });
    conns.forEach(x => { objMap[x.toObj].conns.push(x); });

    // Print example initialization code
    let initCode = '';
    objs.forEach(obj => {
        for (let v in obj.vars) {
            initCode += `${obj.name}.${v} = 0;`;
            if (v in obj.info) {
                initCode += ` // ${obj.info[v]}`;
            }
            initCode += `\n`;
        }
        initCode += `${obj.name}.dt = dt;\n\n`;
    });
    console.log(initCode);

    let header = '';

    header += `\n/*------------------------------ Connections ------------------------------*/\n\n`;
    header += `inline void sub()\n{\n`;

    for (let obj of objs) {
        header += `\n`;
        if (obj.code.trim() != '') {
            header += `    ${obj.name}.step(`;
            for (let conn of obj.conns) {
                header += `    ${conn.fromObj}.${conn.fromVar}, // => ${conn.toVar}\n`;
            }
            header += `T);\n`;
        }
        if (obj.name == 'out') {
            for (let conn of obj.conns) {
                header += `    ${conn.toObj}.${conn.toVar} = ${conn.fromObj}.${conn.fromVar};\n`;
            }
        }
    }

    header += `}\n\n`;

    for (let obj of objs) {
        header += `/*------------------------------ ${obj.cls} ------------------------------*/\n\n`;
        header += `struct ${obj.cls} : public Sub {\n`;
        header += `    num ${Object.keys(obj.vars).filter(x => (obj.vars[x] == 'num')).join(', ')};\n`;
        for (let varName of Object.keys(obj.vars).filter(x => (obj.vars[x] != 'num'))) {
            header += `    ${obj.vars[varName]} ${varName};\n`;
        }
        if (obj.code.trim() != '') {
            header += `inline void step(`;
            for (let conn of obj.conns) {
                header += `num ${conn.toVar}, `;
            }
            header += `num T)\n{\n`;
            header += `    ${obj.code}\n`;
            header += `}\n`;
        }
        header += `} ${obj.name};\n\n`;
    }

    fs.writeFileSync('test/ModelSub.hh', header);

}

main();
