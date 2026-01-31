declare module "mues:gpio" {
  export const PA0: any;
  export const PA1: any;
  export const PA2: any;
  export const PA3: any;
  export const PA4: any;
  export const PA5: any;
  export const PA6: any;
  export const PA7: any;
  export const PA8: any;
  export const PA9: any;
  export const PA10: any;
  export const PA11: any;
  export const PA12: any;
}

declare module "mues:serial" {
  export const term: any;
  export class Term {
    constructor();
    setup(options: any): void;
    on(event: string, callback: (data: Uint8Array) => void): void;
    write(data: string, length?: number): void;
  }
}
