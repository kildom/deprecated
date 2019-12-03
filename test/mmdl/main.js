
const fs = require('fs');

function parseFile(file, root)
{
    let lines = fs.readFileSync(file, 'UTF-8');
    lines = lines.split(/\s*\r?\n/);
    root.text = 'MODEL';
    root.loc = file;
    root.sub = root.sub || [];
    let cur = root;
    let ind = '';
    let last = null;
    let indStack = [];
    let objStack = [];
    for (let i = 0; i < lines.length; i++)
    {
        let line = lines[i];
        if (line.trim().startsWith('##') || line.trim() == '') continue;
        if (!line.startsWith(ind)) {
            // indent decreased - go back to parent object and try again this line
            cur = objStack.pop();
            ind = indStack.pop();
            i--;
            continue;
        } else if (line.startsWith(ind + ' ') || line.startsWith(ind + '\t')) {
            // indent increased - go inside last object and try again this line
            indStack.push(ind);
            objStack.push(cur);
            cur = last;
            ind = line.replace(/^(\s*).*$/, '$1');
            i--;
            continue;
        } else {
            last = { text: line.trim(), loc: `${file}:${i + 1}`, sub: [] };
            cur.sub.push(last);
        }
    }
}

function joinCode(sub, ind)
{
    let code = '';
    for (let entry of sub)
    {
        code += `${ind}${entry.text}\r\n`;
        code += joinCode(entry.sub, `${ind}    `);
    }
    return code;
}

function constructCode(entry, inlineCode)
{
    if (inlineCode)
    {
        if (entry.sub.length)
            throw Error(`${entry.sub[0].loc}: code already provided.`);
        return `    ${inlineCode};\r\n`;
    }
    else
    {
        if (entry.sub.length == 0 && !inlineCode)
            throw Error(`${entry.loc}: no code provided.`);
        return joinCode(entry.sub, '    ');
    }
}

function explodeNames(namesStr)
{
    return namesStr.split(/\s*,\s*/);
}


class MmdlError extends Error
{
    constructor(entry, text)
    {
        super(`${entry.loc}: ${text}`);
    }
};


class Class
{
    /*
    
class items:
    - +struct - code to place in state structure
    - init - code to place in state initialization function
    - +finalize - code to finalize state (e.g. free memory)
    - +locals - code to place in simulation function local variables
    - +restore - code to restore locals from state structure
    - +store - code to store locals in the state structure
    - +output [name[,name[,...]]] - code to calculate output data (multiple outputs should be grouped only if needed)
            names starting with _ are private
    - +output name = code; - short notation of above
    - +provide [name[,name[,...]]] - like output, but does not allocate local variables automatically
    - +override [name[,name[,...]]] - code that overrides symbols with value for the next step
    - state x - code to calculate next value of the state (using differential or directly)
    - state x` = code; - short notation of differential
    - state x# = code; - short notation of direct calculation of next state value
    - init x = code; - short notation of state initialization
    - input [name[,name[,...]]] - input signals (does not create local variable, but replaces symbol)
    - input name - input signal (optional code provides default value if not connected)
    - input name = code; - code to calculate input value if it is not connected
    
    */
    constructor(classEntry, name)
    {
        this.name = name;
        this.loc = classEntry.loc;
        this.prefix = '`unknown prefix`';
        this.struct = '';
        this.locals = '';
        this.restore = '';
        this.store = '';
        this.finalize = '';
        this.expressions = [];
        this.parseSub(classEntry.sub);
        //this.processSub();
    }
    
    parseSub(sub)
    {
        for (let entry of sub)
        {
            if ((m = entry.text.match(/^(struct|locals|restore|store|finalize)$/)))
                this.addSimpleEntry(entry, m[1], constructCode(entry));
            else if ((m = entry.text.match(/^(struct|locals|restore|store|finalize)\s+(.+)$/)))
                this.addSimpleEntry(entry, m[1], constructCode(entry, m[2]));
            else if ((m = entry.text.match(/^output?\s+([a-zA-Z0-9_,\s]+)$/)))
                this.addOutput(entry, explodeNames(m[1]), constructCode(entry), true);
            else if ((m = entry.text.match(/^output?\s+([a-zA-Z0-9_]+)\s*=\s*(.+)$/)))
                this.addOutput(entry, [ m[1] ], constructCode(entry, `@${m[1]} = ${m[2]}`), true);
            else if ((m = entry.text.match(/^provides?\s+([a-zA-Z0-9_,\s]+)$/)))
                this.addOutput(entry, explodeNames(m[1]), constructCode(entry), false);
            else if ((m = entry.text.match(/^provides?\s+([a-zA-Z0-9_]+)\s*=\s*(.+)$/)))
                this.addOutput(entry, [ m[1] ], constructCode(entry, `@${m[1]} = ${m[2]}`), false);
            else if ((m = entry.text.match(/^overrides?\s+([a-zA-Z0-9_,\s]+)$/)))
                this.addOverride(entry, explodeNames(m[1]), constructCode(entry));
            else if ((m = entry.text.match(/^overrides?\s+([a-zA-Z0-9_]+)\s*=\s*(.+)$/)))
                this.addOverride(entry, [ m[1] ], constructCode(entry, `@${m[1]} = ${m[2]}`));
            else
                throw Error(`${entry.loc}: Syntax error.`);
        }
    }

    addSimpleEntry(entry, name, code)
    {
        this[name] += code;
    }

    addOutput(entry, names, code, addLocal)
    {
        this.addExpression(names, [], code);
        if (addLocal)
        {
            for (let n of names)
                this.locals += `    double @${n};\r\n`;
        }
    }

    addOverride(entry, names, code)
    {
        this.addExpression([], names, code);
    }

    addExpression(provides, overrides, code)
    {
        let requires = {};
        code.replace(/@([a-zA-Z0-9_]+)/g, (_, id) => { requires[id] = true; });
        for (let p of provides) delete requires[p];
        for (let p of overrides) delete requires[p];
        code = code
            .replace(/(@[a-zA-Z0-9_]+)#/g, '$1__next')
            .replace(/(@[a-zA-Z0-9_]+)`/g, '$1__det');
        let exp = {
            code: code,
            provides: provides,
            overrides: overrides,
            requires: Object.keys(requires)
        };
        this.expressions.push(exp);
    }
};


function createStructure(root)
{
    let classes = {};
    for (let entry of root.sub)
    {
        if ((m = entry.text.match(/^class\s+([a-zA-Z0-9_]+)$/)))
        {
            classes[m[1]] = new Class(entry, m[1]);
        }
        else
        {
            throw new MmdlError(entry, 'Unknown top level entry!');
        }
    }
    return {
        classes: classes
    };
}

let root = {};
parseFile('../m.mmdl', root);
console.log(JSON.stringify(createStructure(root), null, 4));


/*

class Class
{
    constructor(classEntry, name)
    {
        this.name = name;
        this.loc = classEntry.loc;
        this.states = {};
        this.inputs = {};
        this.outputs = {};
        this.defaults = {};
        this.parseSub(classEntry.sub);
        this.processSub();
    }

    processSub()
    {
        for (let output of this.outputs)
        {
            output.depends = output.depends.filter((name) => (!(name in this.states) && !(name in this.outputs)));
        }
    }

    parseSub(sub)
    {
        for (let entry of sub)
        {
            if ((m = entry.text.match(/^output\s+([a-zA-Z0-9_]+)$/)))
                this.addOutput(m[1], entry, this.getCode(entry));
            else if ((m = entry.text.match(/^output\s+([a-zA-Z0-9_]+)\s*=\s*(.+)$/)))
                this.addOutput(m[1], entry, this.getCode(entry, m[2]));
            else
                throw Error(`${entry.loc}: Syntax error.`);
        }
    }

    getCode(entry, inlineCode)
    {
        if (inlineCode)
        {
            if (entry.sub.length)
                throw Error(`${entry.sub[0].loc}: code already provided.`);
            return `    ${inlineCode}`;
        }
        else
        {
            if (entry.sub.length == 0 && !inlineCode)
                throw Error(`${entry.loc}: no code provided.`);
            return joinCode(entry.sub, '    ');
        }
    }

    addOutput(name, entry, code)
    {
        if (name in this.outputs)
            throw Error(`${entry.loc}: Output already defined.`);
        let depends = [];
        code.replace(/@([A-Za-z0-9_]+)/g, (_,m) => { depends.push(m); });
        this.outputs[name] = {
            name: name,
            code: code,
            depends: depends
        }
    }

    getStateCode(prefix)
    {
        let str = '';
        for (let s in states)
            str += `    number_t ${prefix}${s}\r\n`;
        return str;
    }

    getRestoreCode(prefix)
    {
        let str = '';
        for (let s in states)
            str += `    number_t ${prefix}${s} = state.${prefix}${s}\r\n`
                + `    number_t ${prefix}${s}__next\r\n`
                + `    number_t ${prefix}${s}__det\r\n`;                
        return str;
    }

    getStoreCode(prefix)
    {
        let str = '';
        for (let s in states)
            str += `    state.${prefix}${s} = ${prefix}${s};\r\n`;
        return str;
    }

    getOutputs()
    {
        let r = {};
        for (let name in this.outputs)
            r[name] = this.outputs.depends;
        return r;
    }

    getInputs()
    {
        let r = {};
        for (let name in this.inputs)
            r[name] = !!this.inputs.defaultCode;
        return r;
    }

    getOutputCode(prefix, name)
    {
        let output = this.outputs[name];
        return output.code.replace('@', prefix);
    }

    getNextStateCode(prefix)
    {
        return this.nextStateCode.replace('@', prefix);
    }

    getApplyCode(prefix)
    {
        let str = '';
        for (let s in states)
            str += `    ${prefix}${s} = ${prefix}${s}__next;\r\n`;
        return str;
    }
}


//console.log(JSON.stringify(root, null, 4));

/*

class {name}
    state|output|default {name}[`|#]
        C code
    state {name}` = C expression
    ===>
    state {name}`
        {name}` = C expression

*/
