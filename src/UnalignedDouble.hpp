#ifndef UNALIGNED_DOUBLE_HPP
#define UNALIGNED_DOUBLE_HPP

#include "Common.hpp"

namespace mues {

struct UnalignedDouble
{
#if MUES_DOUBLE_ALIGNMENT_STRICT
    uint32_t low32;
    uint32_t high32;
#elif MUES_DOUBLE_ALIGNMENT_BY_COMPILER
    uint32_t buffer[2];
#elif MUES_DOUBLE_ALIGNMENT_NONE
    double value;

    UnalignedDouble(double newValue):
        value(newValue)
    {
    }

    UnalignedDouble(const UnalignedDouble &other):
        value(other.value)
    {
    }

    UnalignedDouble &operator=(const UnalignedDouble &other)
    {
        value = other.value;
        return *this;
    }

    double operator=(double newValue)
    {
        value = newValue;
        return newValue;
    }

    operator double()
    {
        return value;
    }
#else
#  error "Double alignment not defined"
#endif
};

}  // namespace mues

#endif  // UNALIGNED_DOUBLE_HPP
