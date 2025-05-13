
import { ArrayBufferViewType, RegisterCallbacks } from '../src-common/common';


export interface GuestSandboxObject {

    _onDataToHost?: (data: any) => string;
    _onDataFromHost?: (data: string) => any;
    _call?: (groupId: number, functionId: number, arg: any) => any;
        
    call(groupId: number, functionId: number, arg: any): any;

    imports: RegisterCallbacks;

    exports(obj: any, groupId?: number): number;
};

declare global {
  var __sandbox__: GuestSandboxObject;
  interface GlobalThis {
    __sandbox__: GuestSandboxObject;
  }
}
