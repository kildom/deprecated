
import { a, x as ax } from "./a.mjs";

export var x = 'iB';

export function b() {
    try { console.log('Bf: b', x); } catch (e) { console.log('Bf: b exception'); }
    try { console.log('Bf: ax', ax); } catch (e) { console.log('Bf: ax exception'); }
    try { x = 201; } catch (e) { console.log('Bf: set exception'); }
}

console.log('B: init b');
a();

x = 200;
