#ifndef ACCESS_HPP
#define ACCESS_HPP

#include "Common.hpp"
#include "Value.hpp"
#include "Access-forward.hpp"  // Added forward header inclusion

namespace mues {
namespace Access {

struct Table
{
};

static const Access::Table &from(MUES_PARAMS Value::T value);
static const Access::Table &from(MUES_PARAMS Value::T value);

}  // namespace Access
}  // namespace mues

#endif  // ACCESS_HPP
