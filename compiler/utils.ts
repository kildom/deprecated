

export function empty<T = any>(): T {
    return Object.create(null);
}

export function assertNever(x: never): never {
    throw new Error("Unexpected value: " + x);
}
