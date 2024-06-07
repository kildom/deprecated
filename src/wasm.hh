#ifndef WASM_HH
#define WASM_HH

#define WASM_EXPORT(name) extern "C" __attribute__((used)) __attribute__((export_name(#name)))
#define WASM_IMPORT(module, name) extern "C" __attribute__((used)) __attribute__((import_module(#module))) __attribute__((import_name(#name)))

#endif
