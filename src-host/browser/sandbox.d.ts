
declare global {
    var sandbox: {
        GuestError: typeof GuestError;
        EngineError: typeof EngineError;
        setSandboxModule: typeof setSandboxModule;
        instantiate: typeof instantiate;
    };
}
