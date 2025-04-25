#ifndef WASM_HH
#define WASM_HH

#ifdef __cplusplus
#define _WASM_HH_EXTERN_C extern "C"
#else
#define _WASM_HH_EXTERN_C
#endif

#define WASM_EXPORT(name) _WASM_HH_EXTERN_C __attribute__((used)) __attribute__((export_name(#name)))
#define WASM_IMPORT(module, name) _WASM_HH_EXTERN_C __attribute__((used)) __attribute__((import_module(#module))) __attribute__((import_name(#name)))

#endif
