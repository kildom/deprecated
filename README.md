# uvm-compiler
Script compiler for uVM

### Basic syntax differences with C/C++

 * Type casting is: `value@type`, e.g. cast from `int` to `byte` is`int_value@byte`.
 * Assignment, increment and decrement is not an expression, but a statement.
   ```javascript
   t = arr[i++] // Invalid

   t = arr[i] //
   i++;       // Correct

   if ((result = func())) { } // Invalid

   result = func() //
   if (result) { } // Correct
   ```
 * Variable definitions starts with a `var` keyword.
   ```javascript
   var int x;
   ```
 * Function and method definitions starts with a `function` keyword. `void` return type is omitted.
   ```javascript
   function f() { }
   function int g() { return 0; }
   ```
 * Array and reference decorators are appended to the end of type.
   ```javascript
   var int[10] x; // Array of 10 integers
   var int&[10] y; // Array of 10 references to integer
   ```