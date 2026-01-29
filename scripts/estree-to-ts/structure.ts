export const interfaces: { [key: string]: InterfaceDeclaration } = Object.create(null);


export const enums: { [key: string]: string[] } = Object.create(null);



export class Type {
    components: InterfaceDeclaration[] = [];

    dump(references: Set<string>, needsParens: boolean, indent: string): string {
        throw new Error('Method not implemented.');
    }
    resolve(): void { }
    collectReferences(references: Set<InterfaceDeclaration>): void { }
};

export class SimpleType extends Type {
    constructor(public name: string) {
        super();
    }
    dump(references: Set<string>): string {
        return this.name;
    }
}

export class OrType extends Type {
    constructor(public types: Type[]) {
        super();
    }
    resolve(): void {
        for (let t of this.types) {
            t.resolve();
        }
    }
    dump(references: Set<string>, needsParens: boolean, indent: string): string {
        if (needsParens) {
            return '(' + this.types.map(t => t.dump(references, false, indent)).join(' | ') + ')';
        } else {
            return this.types.map(t => t.dump(references, false, indent)).join(' | ');
        }
    }
    collectReferences(references: Set<InterfaceDeclaration>): void { 
        for (let t of this.types) {
            t.collectReferences(references);
        }
    }
}

export class ArrayType extends Type {
    constructor(public type: Type) {
        super();
    }
    resolve(): void {
        this.type.resolve();
    }
    dump(references: Set<string>, needsParens: boolean, indent: string): string {
        return this.type.dump(references, true, indent) + '[]';
    }
    collectReferences(references: Set<InterfaceDeclaration>): void { 
        this.type.collectReferences(references);
    }
}

export class ComplexType extends Type {
    public intf?: InterfaceDeclaration;
    public enumName?: string;
    public enumItems?: string[];
    constructor(public name: string) {
        super();
    }
    resolve(): void {
        if (interfaces[this.name]) {
            this.intf = interfaces[this.name];
        } else if (enums[this.name]) {
            this.enumName = this.name;
            this.enumItems = enums[this.name];
        } else {
            throw new Error('Unknown type: ' + this.name);
        }
    }
    dump(references: Set<string>, needsParens: boolean, indent: string): string {
        let str = '';
        if (this.intf) {
            references.add(this.intf.aliasName);
            str = `Ast${this.intf.aliasName}`;
        } else if (this.enumName) {
            references.add(this.enumName);
            str = `Ast${this.enumName}`;
        }
        return str;
    }
    collectReferences(references: Set<InterfaceDeclaration>): void {
        if (this.intf) {
            references.add(this.intf);
        }
    }
}

export class ObjectType extends Type {
    constructor(public fields: {[key: string]: Type}) {
        super();
    }
    resolve(): void {
        for (let t of Object.values(this.fields)) {
            t.resolve();
        }
    }
    dump(references: Set<string>, needsParens: boolean, indent: string): string {
        let text = '{\n';
        text += dumpFields(references, this.fields, indent + '    ', '');
        text += indent + '}';
        return text;
    }
    collectReferences(references: Set<InterfaceDeclaration>): void {
        for (let t of Object.values(this.fields)) {
            t.collectReferences(references);
        }
    }
}


export class InterfaceDeclaration {
    public type?: string;
    public allTypes: string[] = [];
    public fields: {[key: string]: Type} = Object.create(null);
    public superclassesStr: string[] = [];
    //public inherits: InterfaceDeclaration[] = [];
    public kind: 'interface' | 'class' = 'class';
    public condition?: string;
    public links: string[] = [];
    //public aliasName: string;
    //public conditional?: string;
    //public descendants: InterfaceDeclaration[] = [];
    //public containedIn: InterfaceDeclaration[] = [];

    // Inheritance:
    public subclasses: InterfaceDeclaration[] = []; // inherits by this class directly
    public superclasses: InterfaceDeclaration[] = []; // this class inherits directly those
    public nonIntfSuperclass?: InterfaceDeclaration; // this class inherits this class directly if we skip interfaces
    public ancestors: InterfaceDeclaration[] = []; // all superclasses in the hierarchy
    public descendants: InterfaceDeclaration[] = []; // all subclasses in the hierarchy
    // Containment:
    public containers: InterfaceDeclaration[] = []; // all classes that contain this class (as field type)
    public components: InterfaceDeclaration[] = []; // all classes that are used in fields of this class

    constructor(
        public name: string,
    ) {
    }

    dump() {
        console.log(`${this.kind} ${this.name}:`);
        console.log(`        type:           ${this.type ?? '[none]'}`);
        console.log(`        all types:      ${this.allTypes.length > 0 ? this.allTypes.join(', ') : '[none]'}`);
        console.log(`        super:          ${this.superclasses.map(s => s.name).join(', ')}`);
        console.log(`        non-intf super: ${this.nonIntfSuperclass ? this.nonIntfSuperclass.name : '[none]'}`);
        console.log(`        ancestors:      ${this.ancestors.map(s => s.name).join(', ')}`);
        console.log(`        sub:            ${this.subclasses.map(s => s.name).join(', ')}`);
        console.log(`        descendants:    ${this.descendants.map(s => s.name).join(', ')}`);
        console.log(`        components:     ${this.components.map(s => s.name).join(', ')}`);
        console.log(`        containers:     ${this.containers.map(s => s.name).join(', ')}`);
        console.log(`        fields:`);
        for (let [fname, ftype] of Object.entries(this.fields)) {
            console.log(`            ${fname}: ${ftype.components.map(c => c.name).join(', ')}`);
        }
    }

    extend(inheritance: string[], fields: {[key: string]: Type}) {
        this.superclassesStr.push(...inheritance);
        this.fields = { ...this.fields, ...fields };
    }
    resolve(): void {
        if (this.fields.type) {
            if (!(this.fields.type instanceof SimpleType)) {
                throw new Error('Interface type field must be a simple type.');
            }
            this.type = this.fields.type.name.replace(/"/g, '');
            if (this.type === 'string') {
                this.type = undefined;
            }
            delete this.fields.type;
        }
        this.superclassesStr = [...new Set(this.superclassesStr)];
        for (let parentName of this.superclassesStr) {
            let parent = interfaces[parentName];
            if (!parent) {
                throw new Error(`Unknown interface to inherit: ${parentName}`);
            }
            this.inherits.push(parent);
        }
        for (let t of Object.values(this.fields)) {
            t.resolve();
        }
    }
    getType(): string | null {
        if (this.type) {
            return this.type;
        }
        for (let parent of this.inherits) {
            let t = parent.getType();
            if (t) {
                return t;
            }
        }
        return null;
    }

    resolveDependencies() {
    }
};
