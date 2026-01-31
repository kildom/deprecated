// main.ts
import { PA1, PA2 } from "mues:gpio";

// mod.ts
import { PA9, PA10 } from "mues:gpio";
import { term } from "mues:serial";
term.setup({
  baudRate: 115200,
  bits: 8,
  parity: "none",
  stopBits: 1,
  txPin: PA9,
  rxPin: PA10,
  mode: "DMA",
  rxBufferSize: 192,
  txBufferSize: 64,
  rxTimeout: 10
});
var x = 13;
function test() {
  term.write("One loop iteration!\n", x);
}

// main.ts
var x2 = 12;
while (true) {
  let y = x2 * 2;
  for (let i = 0; i < 1e6; i++) {
    PA1.some(() => i);
  }
  PA1.setHigh(x2);
  await new Promise((resolve) => setTimeout(resolve, 100));
  PA2.setLow(x);
  await new Promise((resolve) => setTimeout(resolve, 100));
  PA1.setLow();
  await new Promise((resolve) => setTimeout(resolve, 100));
  PA2.setHigh();
  await new Promise((resolve) => setTimeout(resolve, 100));
  test();
}
export {
  x2 as x
};
