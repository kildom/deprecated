
#include <stdint.h>
#include <stdlib.h>

#include "logdpcm.h"

#pragma region 8 BIT

static const int16_t logTable[] = {
    // if index < 12: index
    // if index >= 12: round(12 * p ** (index - 12))
    // where p = (32768 / 12) ** (1 / (128 - 12))
    // and "**" is power operator.
    // The formula can be explained as follows:
    //    1. Fill with increasing values up to 12.
    //    2. Starting from 12, use a geometric progression with a ratio of "p".
    //       The "p" ensures that the value at index 128 (index just after the table)
    //       will be 32768 (2**15).
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24,
    25, 27, 29, 31, 33, 36, 38, 41, 44, 47, 50, 54, 58, 62, 66, 71, 76, 81, 87, 93, 99,
    106, 114, 122, 131, 140, 150, 160, 172, 184, 197, 211, 225, 241, 258, 277, 296, 317,
    339, 363, 389, 416, 446, 477, 511, 547, 586, 627, 671, 719, 769, 824, 882, 944, 1011,
    1082, 1159, 1240, 1328, 1422, 1522, 1629, 1744, 1868, 1999, 2141, 2292, 2453, 2627,
    2812, 3011, 3223, 3451, 3694, 3955, 4234, 4533, 4853, 5196, 5562, 5955, 6375, 6825,
    7307, 7823, 8375, 8966, 9599, 10277, 11002, 11779, 12610, 13501, 14454, 15474, 16566,
    17735, 18987, 20328, 21763, 23299, 24944, 26704, 28589, 30607
};

static const uint16_t firstValueTable[] = {
    /* A range of sample values is translated to the same index in logTable. It is done
     * by finding the closest value from table logTable to the sample value. It is done
     * using logarithmic scale. To speed up the process, the this table contains the
     * first value of each range.
     */
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 23, 25,
    26, 28, 30, 32, 35, 37, 40, 43, 46, 49, 52, 56, 60, 64, 69, 74, 79, 84, 90, 96, 103,
    110, 118, 127, 136, 145, 155, 166, 178, 191, 204, 218, 233, 250, 268, 287, 307, 328,
    351, 376, 403, 431, 462, 494, 529, 567, 607, 649, 695, 744, 797, 853, 913, 977, 1046,
    1120, 1199, 1284, 1375, 1472, 1575, 1686, 1805, 1933, 2069, 2216, 2372, 2539, 2718,
    2910, 3116, 3336, 3571, 3823, 4093, 4381, 4691, 5022, 5376, 5756, 6162, 6597, 7062,
    7561, 8095, 8666, 9278, 9933, 10634, 11384, 12188, 13048, 13970, 14956, 16011, 17141,
    18351, 19647, 21034, 22518, 24108, 25810, 27631, 29581,
};

static const uint8_t limitsTable[][2] = {
    /* To speed up process of finding right index, the table contains the range of indexes
     * (first and last, inclusive). The table is indexed using formula: 31 - CLZ(value ** 2) - 8
     * The formula is loosely proportional to logaritm of the value.
     */
    { 20, 21 }, { 22, 26 }, { 27, 31 }, { 32, 36 },
    { 37, 42 }, { 42, 47 }, { 47, 52 }, { 52, 57 },
    { 57, 62 }, { 62, 67 }, { 67, 72 }, { 72, 77 },
    { 77, 82 }, { 82, 87 }, { 87, 92 }, { 92, 98 },
    { 98, 103 }, { 103, 108 }, { 108, 113 }, { 113, 118 },
    { 118, 123 }, { 123, 127 },
};


static uint32_t indexFromValue(uint32_t value) {
    if (value <= 20) {
        return value;
    } else if (value >= firstValueTable[127]) {
        return 127;
    } else {
        uint32_t range = 31 - __builtin_clz(value * value) - 8;
        uint32_t smallestIndex = limitsTable[range][0];
        uint32_t biggestIndex = limitsTable[range][1];
        uint32_t checkIndex = smallestIndex + 1;
        while (checkIndex <= biggestIndex && value >= firstValueTable[checkIndex]) {
            checkIndex++;
        }
        return checkIndex - 1;
    }
}


uint8_t encodeSample(int16_t sampleValue, int16_t* state)
{
    uint8_t index;
    int32_t newState;
    uint8_t result;
    int32_t diff = (int32_t)sampleValue - (int32_t)(*state);

    if (diff >= 0) {
        index = indexFromValue(diff);
        newState = (int32_t)(*state) + (int32_t)logTable[index];
        if (newState > 32767) {
            index--;
            newState = (int32_t)(*state) + (int32_t)logTable[index];
        }
        result = 0x00;
    } else {
        index = indexFromValue(-diff);
        newState = (int32_t)(*state) - (int32_t)logTable[index];
        if (newState < -32768) {
            index--;
            newState = (int32_t)(*state) - (int32_t)logTable[index];
        }
        result = 0x80;
    }

    result |= index;
    (*state) = newState;

    if (abs(sampleValue) <= abs((*state) - sampleValue)) {
        result = 0x80;
        (*state) = 0;
    }

    return result;
}

int16_t decodeSample(uint8_t encoded, int16_t *state)
{
    int16_t diff = logTable[encoded & 0x7F];
    if (encoded & 0x80) {
        if (diff == 0) {
            (*state) = diff;
            return diff;
        }
        diff = -diff;
    }
    (*state) += diff;
    return (*state);
}

int16_t decodeSampleSafe(uint8_t encoded, int16_t* state)
{
    int32_t diff = logTable[encoded & 0x7F];
    if (encoded & 0x80) {
        if (diff == 0) {
            (*state) = diff;
            return diff;
        }
        diff = -diff;
    }
    int32_t result = (int32_t)(*state) + diff;
    if (result > 32767) {
        result = 32767;
    } else if (result < -32768) {
        result = -32768;
    }
    (*state) = (int16_t)result;
    return (*state);
}

#pragma endregion

#pragma region 4 BIT

static const int16_t logTable4[] = {
    /*
    0   1   2   3   4    5     6     7 
    0,  8, 25, 61, 149, 363,  883, 2152 */
    0, 16, 39, 95, 232, 565, 1378, 3360

};


static uint32_t indexFromValue4(int32_t value) {
    if (value < 149) {
        if (value < 25) {
            if (value < 8) {
                return 0; // value 0
            } else {
                return 1; // value 16
            }
        } else {
            if (value < 61) {
                return 2; // value 43
            } else {
                return 3; // value 116
            }
        }
    } else {
        if (value < 883) {
            if (value < 363) {
                return 4; // value 312
            } else {
                return 5; // value 840
            }
        } else {
            if (value < 2152) {
                return 6; // value 2261
            } else {
                return 7; // value 6087
            }
        }
    }
}

uint8_t encodeSample4(int16_t sampleValue, int16_t* state)
{
    uint8_t index;
    int32_t newState;
    uint8_t result = 0x00;;
    int32_t diff = (int32_t)sampleValue - (int32_t)(*state);

    if (diff > -8) {
        index = indexFromValue4(diff);
        newState = (int32_t)(*state) + (int32_t)logTable4[index];
        if (newState > 32767) {
            index--;
            newState = (int32_t)(*state) + (int32_t)logTable4[index];
        }
    } else {
        index = indexFromValue4(-diff);
        newState = (int32_t)(*state) - (int32_t)logTable4[index];
        if (newState < -32768) {
            index--;
            newState = (int32_t)(*state) - (int32_t)logTable4[index];
        }
        if (index > 0) {
            result = 0x08;
        }
    }

    result |= index;
    (*state) = newState;

    if (result == 0x08) exit(1);

    if (abs(sampleValue) <= abs((*state) - sampleValue)) {
        result = 0x08;
        (*state) = 0;
    }

    return result;
}

int16_t decodeSample4(uint8_t encoded, int16_t *state)
{
    int16_t diff = logTable4[encoded & 0x07];
    if (encoded & 0x08) {
        if (diff == 0) {
            (*state) = diff;
            return diff;
        }
        diff = -diff;
    }
    (*state) += diff;
    return (*state);
}

int16_t decodeSampleSafe4(uint8_t encoded, int16_t* state)
{
    int32_t diff = logTable4[encoded & 0x07];
    if (encoded & 0x08) {
        if (diff == 0) {
            (*state) = diff;
            return diff;
        }
        diff = -diff;
    }
    int32_t result = (int32_t)(*state) + diff;
    if (result > 32767) {
        result = 32767;
    } else if (result < -32768) {
        result = -32768;
    }
    (*state) = (int16_t)result;
    return (*state);
}

#pragma endregion
