#ifndef GC_HPP
#define GC_HPP

#include "Common.hpp"

#include "GC-forward.hpp"
#include "Value.hpp"
#include "Head.hpp"
#include "Block.hpp"

namespace mues {
namespace GC {


void incRef(Value::T value);
void decRef(Value::T value);

#if MUES_GC_INCREMENTAL
void moveRef(Value::T value);
#else
static inline void moveRef(Value::T value)
{
}
#endif

void incRef(Head::Base* head);
void decRef(Head::Base* head);

static inline void moveRef(Head::Base* head)
{
    if (MUES_GC_INCREMENTAL) {
        head->flags |= 16;
    }
}

void incRef(Block::Base* block);
void decRef(Block::Base* block);

#if MUES_GC_INCREMENTAL
void moveRef(Block::Base* block);
#else
static inline void moveRef(Block::Base* block)
{
}
#endif

}  // namespace GC
}  // namespace mues
#endif  // GC_HPP
