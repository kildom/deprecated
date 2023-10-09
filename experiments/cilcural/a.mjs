
import { b, x as bx } from "./b.mjs";

export let x = 'iA';
console.log('A: before a', x);

export function a() {
    try { console.log('Af: a', x); } catch (e) { console.log('Af: a exception'); }
    try { console.log('Af: bx', bx); } catch (e) { console.log('Af: bx exception'); }
    try { x = 101; } catch (e) { console.log('Af: set exception'); }
}

function g() {
    {
        let a = 12;
        h(); // Function is available before it is defined in the block or module, so function object must be created on enter to the block (or module).
        //g(); // But arrow function and function expressions not.
        w();
        function h() {
            console.log('h', a);
        }
        let g = () => {
            console.log('g', a);
        }
        let w = function ww() {
            console.log('w', a);
        }
    }
}

console.log('A: init a');
b();

x = 100;
a();
g();