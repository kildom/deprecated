
import * as fs from 'node:fs';
import { AstProgram } from './ast/Program';
import { Application } from './Application';

let app = new Application();
app.parse('test.js', 'test', fs.readFileSync('../tmp/test.js', 'utf-8'));
app.compile();
app.dump();
