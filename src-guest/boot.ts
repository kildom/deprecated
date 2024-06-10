(function(): void {

    const s = __sandbox__;

    function createValue(value: any): void {
        switch (typeof value) {
            case 'object':
            case 'function':
                if (value === null) {
                    s.createNull();
                    return;
                }
                throw new Error('Not implemented.');
                break;
            case 'string':
                s.createString(value);
                break;
            case 'bigint':
                s.createBigInt(value.toString());
                break;
            case 'number':
                s.createNumber(value);
                break;
            case 'boolean':
                s.createBoolean(value);
                break;
            case 'symbol':
                throw new Error('Cannot send Symbol to host.');
            case 'undefined':
                s.createUndefined();
                break;
        }
    }

    __sandbox__.createHostValue = function(...args: any[]) {
        s.cleanValues();
        for (let arg of args) {
            createValue(arg);
        }
    };

})();
