import { readFileSync } from "fs";
import { resolve } from "path";

function main() {
    const wasmPath = process.argv[2];
    if (!wasmPath) {
        console.error("Usage: node module-info.js <module.wasm>");
        process.exit(1);
    }

    const fullPath = resolve(wasmPath);

    let bytes: Buffer;
    try {
        bytes = readFileSync(fullPath);
    } catch (err) {
        console.error(`Failed to read file: ${fullPath}`);
        console.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
        return;
    }

    console.log(`File: ${fullPath}`);
    console.log(`Size: ${bytes.byteLength} (${(bytes.byteLength / (1024 * 1024)).toFixed(2)} MB)\n`);

    let mod: WebAssembly.Module;
    try {
        mod = new WebAssembly.Module(bytes);
    } catch (err) {
        console.error("Failed to compile WebAssembly module:");
        console.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
        return;
    }

    const imports = WebAssembly.Module.imports(mod);
    const exports = WebAssembly.Module.exports(mod);

    console.log("Imports:");
    if (imports.length === 0) {
        console.log("  (none)");
    } else {
        for (const im of imports) {
            console.log(
                `  ${im.kind.toUpperCase()} ${im.module}.${im.name}`
            );
        }
    }

    console.log("\nExports:");
    if (exports.length === 0) {
        console.log("  (none)");
    } else {
        for (const ex of exports) {
            console.log(`  ${ex.kind.toUpperCase()} ${ex.name}`);
        }
    }
}

main();