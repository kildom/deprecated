#include "Common.hpp"
#include "GC.hpp"

namespace mues {
namespace GC {


void incRef(Head::Base* head)
{
    let newValue = head->flags;
    if (MUES_GC_REFCOUNTING) {
        newValue += MUES_GC_INCREMENTAL ? 32 : 16;
    }
    if (MUES_GC_INCREMENTAL) {
        newValue |= 16;
    }
    if (MUES_CHECK_REFCOUNT && newValue >= 0x7FFFFFE0) {
        // TODO: fatal error handler
    }
    head->flags = newValue;
}

void decRef(Head::Base* head)
{
    let newValue = head->flags;
    if (MUES_GC_REFCOUNTING) {
        newValue -= MUES_GC_INCREMENTAL ? 32 : 16;
        if (newValue < 0) {
            //deleteHead(head);
            return;
        }
    }
    if (MUES_GC_INCREMENTAL) {
        newValue |= 16;
    }
    head->flags = newValue;
}


}  // namespace GC
}  // namespace mues
