
import { generateInheritanceDot, generateOwnershipDot } from "./generator-dot";
import { generateTs } from "./generator-ts";
import { parse } from "./parser";
import { interfaces } from "./structure";

function main() {
    parse();
    for (let intf of Object.values(interfaces)) {
        intf.dump();
    }
    generateTs();
    generateInheritanceDot();
    generateOwnershipDot();
}

main();
