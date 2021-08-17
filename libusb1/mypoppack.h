
#if _MSC_VER >= 800

// #pragma pack for Visual C

#pragma pack(pop)

#elif __GNUC__

// packed attribute for GCC

#elif _VINC

// packed by default in VinC

#else

#error Unsupported compiler - unknown struct packing directive

#endif
