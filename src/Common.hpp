#ifndef COMMON_HPP
#define COMMON_HPP

#include <stdint.h>

namespace mues {

#define let auto

#define MUES_GC_REFCOUNTING 1
#define MUES_GC_TRACING 0
#define MUES_GC_INCREMENTAL 0
#define MUES_GC_GENERATIONAL 0
#define MUES_DOUBLE_ALIGNMENT_STRICT 0
#define MUES_DOUBLE_ALIGNMENT_BY_COMPILER 0
#define MUES_DOUBLE_ALIGNMENT_NONE 1
#define MUES_SINGLE_INSTANCE 0

#if INTPTR_MAX > 0x7FFFFFFF
#  define MUES_ARCH_64 1
#  define MUES_ARCH_32 0
#else
#  define MUES_ARCH_64 0
#  define MUES_ARCH_32 1
#endif

class Instance
{
};

#if MUES_SINGLE_INSTANCE
#  define MUES_PARAMS
#  define MUES_ARGS
extern Instance instance;
#else
#  define MUES_PARAMS Instance &instance,
#  define MUES_ARGS instance,
#endif

}  // namespace mues

#define MUES_ASSERT(...)  // TODO: Assert

#endif  // COMMON_HPP
