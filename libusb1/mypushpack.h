
#if _MSC_VER >= 800

// #pragma pack for Visual C

#pragma warning(disable:4103)
#pragma pack(push, 1)
#ifndef PACKED
#define PACKED
#endif

#elif __GNUC__

// packed attribute for GCC

#ifdef PACKED
#undef PACKED
#endif
#define PACKED __attribute__((packed))

#elif _VINC

// packed by default in VinC

#ifndef PACKED
#define PACKED
#endif

#else

#error Unsupported compiler - unknown struct packing directive

#endif
