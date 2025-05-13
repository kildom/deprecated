
import '../guest-sandbox';
import { serialize } from '../../src-common/serializer';
import { deserialize } from '../../src-common/deserializer';
import { IncomingRegistry } from '../../src-common/incoming-registry';
import { OutgoingRegistry } from '../../src-common/outgoing-registry';

// Imports (outgoing calls) setup
let outgoing = new OutgoingRegistry(false);
__sandbox__.imports = ((groupId: number) => {
    return outgoing.get(groupId);
}) as any;
outgoing.set(0, __sandbox__.imports);
outgoing.onCall = (groupId, functionId, args) => {
    return __sandbox__.call(groupId, functionId, args);
};

// Exports (incoming calls) setup
let incoming = new IncomingRegistry();
__sandbox__.exports = function(obj: any, groupId?: number) {
    let msg = incoming.register(obj, groupId);
    __sandbox__.call(0x7FFFFFFF, 0, msg);
    return msg.groupId;
}

__sandbox__._onDataFromHost = deserialize;

__sandbox__._onDataToHost = serialize;

__sandbox__._call = function (groupId: number, functionId: number, arg: any): any {

    if (!globalThis.debug) globalThis.debug = [];

    globalThis.debug.push(['__sandbox__._call', groupId, functionId, arg]);

    if (groupId === 0x7FFFFFFF) {
        outgoing.register(arg);
        return undefined;
    }

    try {
        return incoming.execute(groupId, functionId, arg);
    } catch (e) {
        globalThis.debug.push(['__sandbox__._call exception', e, e.message]);
        throw e;
    }
}
