import assert from 'assert';
import fs from 'node:fs';
import cre from 'con-reg-exp';

async function main() {

    // Process parameters
    if (process.argv.length !== 4) {
        console.error(`Usage: ${process.argv[1]} input_file output_file.ts`);
        process.exit(99);
    }
    let args = {
        input: process.argv[2],
        output: process.argv[3],
    };

    let bin = fs.readFileSync(args.input);
    let base64 = bin.toString('base64');
    fs.writeFileSync(args.output, `
const data: string = ${JSON.stringify(base64)};
export default data;
`);
}

main();
