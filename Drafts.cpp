
#include <stdint.h>
#include <stdlib.h>
#include <stdbool.h>

/*

Memory organization:
ROM: fixed strings, constants, function declarations in undefined order

HEAP: ||  Object table  |  Object dynamic memory  |  Stack  ||

*/

enum class ValueType {
    Integer = (0 << 27),   // -2^26 .. 2^26-1
    Boolean = (1 << 27),   // 0, 1
    Null = (2 << 27),      // none
    Undefined = (3 << 27), // none
    None = (4 << 27),      // 0 - empty slot (also used for uninitialized variables), 1 - end of list
    Symbol = (7 << 27),    // Object Index          description string
    Object = (8 << 27),    // Object Index          prototypeIndex32/16, *keys32, *values32
    Accessor = (9 << 27),  // Object Index          getterIndex, setterIndex
    Scope = (10 << 27),     // Object Index          values[2]
    FunctionRuntime = (11 << 27), // Object Index    stack
    Double = (12 << 27),    // Object Index          low32, high32
    String = (13 << 27),    // Object Index          length32/16, bytes32/16, *ptr32
    BigInt = (14 << 27),    // Object Index          
    Native = (15 << 27),    // Object Index          any[]
};

enum Flags {
    ROM = (1 << 31), // Object index points to offset in ROM where const object is located
                     // TODO: this only applies to value with object index, so maybe it is better to move it to object index flag
    Configurable = (1 << 24), // Only applies to object index
    Enumerable = (1 << 25), // Only applies to object index
    Writable = (1 << 26), // Only applies to object index
};

typedef uintptr_t Value;
static const Value END_OF_LIST_VALUE = (Value)ValueType::None | 1;
static const Value EMPTY_VALUE = (Value)ValueType::None | 0;

const uint32_t REF_COUNTER_INC = 8;

struct Head {
    uint32_t refCounter;
};

template<class T>
struct HeadWithData {
    T* data;
};

struct DoubleHead: public Head {
    double value;
};

struct StringData {
    uint32_t bytes;
    char text[];
};

struct StringHead: public HeadWithData<StringData> {
    uint32_t length;
};

struct ObjectData
{
    Value* externalKeys;
    ObjectData* next;
    uint32_t nativeDataLength;
    uintptr_t nativeData[];
    // [ Value, Value ] properties[]; // if externalKeys == NULL
    // Value values[]; // if externalKeys != NULL
};

struct ObjectHead: public HeadWithData<ObjectData> {
    // Cycles removal: travel all cycle related objects from object table and decrement refCounter
    Value prototype;
};

struct NativeHead: public Head {
    union {
        uint64_t value64;
        uint32_t values[2];
    };
};

struct AccessorHead: public Head {
    Value getter;
    Value setter;
};

struct FunctionDeclaration
{
    uint16_t flags; // is async, is generator
    uint16_t stackSize; // max required stack size (including micro-scopes and variables)
    uint16_t stateSize; // state size required for async and generator state keeping
    uint16_t bytecodeOffset;
    uint16_t scopesCount;
    uint16_t objectScopesCount;
    uint8_t localScopesToKeep[]; // array of varint with stack indexes to copy into FunctionData::scopes
    //uint16_t outerScopesToKeep[]; // array of varint with indexes from other FunctionData::scopes
    //uint8_t bytecode[];
};

struct ScopeHead: public Head {
    Value values[2];
};

struct FunctionData {
    FunctionDeclaration* declaration;
    Value scopes[]; // array of scopes, contains both ScopeHead and Object scopes ("with" statements and global object)
                    // "this" binding for arrow functions is in special scope
                    // Scopes on module level must be initialized at 
};

struct FunctionRuntimeData { // Only for async and generator functions, normal functions will use common stack.
    uint32_t _reserved; // TODO: delete
    Value state[];           // when function suspends, move stack to state and save resume point to state.
};

struct FunctionRuntimeHead: public HeadWithData<FunctionRuntimeData> {
};

struct BigIntHead: public HeadWithData<uint32_t> {
    uint32_t length;
};

struct ModuleHead: public Head {
};


struct MyesContext {
    uint8_t *heap;
    size_t headsCount;
    uintptr_t* upperHeadsMap;
    uintptr_t* lowerHeadsMap;
    Head* heads;
};

template<class T>
struct HeadHelper;

template<>
struct HeadHelper<ObjectHead> {
    static const ValueType type = ValueType::Object;
};

Head* getHeadImpl(MyesContext* ctx, Value value, ValueType expectedType);

template<class T>
T* getHead(MyesContext* ctx, Value value)
{
    return (T*)getHeadImpl(ctx, value, HeadHelper<T>::type);
}

bool isHeap(MyesContext* ctx, void* ptr);
void* reallocHeap(MyesContext* ctx, void* ptr, size_t newSize);

ObjectData* createHeapObjectData(MyesContext* ctx, ObjectHead* head, size_t propertiesCount);



ObjectData* extendHeapObjectData(MyesContext* ctx, ObjectHead* head, size_t propertiesCount)
{
    ObjectData* data = head->data;

    if (!isHeap(ctx, data) || data->externalKeys != nullptr) {
        return createHeapObjectData(ctx, head, 1);
    }

    Value* keys = (Value*)((uint8_t*)&data->nativeData + data->nativeDataLength);
    while (keys[0] != END_OF_LIST_VALUE) {
        keys += 2;
    }
    size_t propertiesEnd = (uint8_t*)keys - (uint8_t*)data;

    ObjectData* newData = (ObjectData*)reallocHeap(ctx, data, propertiesEnd + 2 * sizeof(Value) * propertiesCount + sizeof(Value));

    keys = (Value*)((uint8_t*)newData + propertiesEnd);
    for (size_t i = 0; i < 2 * propertiesCount; i++) {
        keys[0] = EMPTY_VALUE;
        keys++;
    }
    keys[0] = END_OF_LIST_VALUE;

    return newData;
}


void incRef(Value value);

enum class FindObjectDataKeyMode {
    JustFind,
    FindMutable,
    AddIfPossible,
};

Value* findObjectDataKey(MyesContext* ctx, ObjectData* data, Value key, FindObjectDataKeyMode mode)
{
    ObjectData* iter = data;
    Value* firstFreeKey = nullptr;
    Value* firstFreeValue = nullptr;
    while (iter != nullptr && (isHeap(ctx, iter) || mode == FindObjectDataKeyMode::JustFind)) {
        Value* keys = (Value*)((uint8_t*)&iter->nativeData + iter->nativeDataLength);
        Value* values = &keys[1];
        size_t stepCount = 2;
        if (iter->externalKeys != nullptr) {
            values = keys;
            keys = iter->externalKeys;
            stepCount = 1;
        }
        while (keys[0] != END_OF_LIST_VALUE) {
            if (keys[0] == key) {
                return values;
            } else if (keys[0] == EMPTY_VALUE && firstFreeKey == nullptr && iter->externalKeys == nullptr) {
                firstFreeKey = keys;
                firstFreeValue = values;
            }
            values += stepCount;
            keys += stepCount;
        }
        iter = iter->next;
    }
    if (mode == FindObjectDataKeyMode::AddIfPossible && firstFreeKey != nullptr) {
        *firstFreeKey = key;
        incRef(key);
        return firstFreeValue;
    }
    return nullptr;
}


bool setPropertyIfPossible(MyesContext* ctx, ObjectData* data, Value key, Value value)
{
    Value* valueSlot = findObjectDataKey(ctx, data, key, FindObjectDataKeyMode::AddIfPossible);
    if (valueSlot != nullptr) {
        *valueSlot = value;
        incRef(value);
        return true;
    } else {
        return false;
    }
};

void setProperty(MyesContext* ctx, Value object, Value key, Value value)
{
    // TODO: Diagrams contains better solution
    auto* head = getHead<ObjectHead>(ctx, object); //  TODO: handle exception needed?
    auto* data = head->data;
    auto* dataIter = data;
    if (!setPropertyIfPossible(ctx, data, key, value)) {
        data = extendHeapObjectData(ctx, head, 1);
        setPropertyIfPossible(ctx, data, key, value);
    }
}

/*------------------------------------------------------------------------------------ */
// Better approach based on current Diagrams.drawio.svg
/*------------------------------------------------------------------------------------ */

ALWAYS_INLINE
static inline bool stringKeyEq(Value a, Value b) {
    if (!IS_STRING(a) || !IS_STRING(b)) return false;
    StringHead* aHead = getHead<StringHead>(a);
    StringHead* bHead = getHead<StringHead>(b);
    if (aHead->length != bHead->length) return false;
    StringData* aData = getData<StringData>(aHead);
    StringData* bData = getData<StringData>(bHead);
    if (aData->bytes != bData->bytes) return false;
    uintptr_t aHash = aData->hash;
    if (aHash == EMPTY_HASH) aHash = calculateStringHash(aData);
    uintptr_t bHash = bData->hash;
    if (bHash == EMPTY_HASH) bHash = calculateStringHash(bData);
    if (aHash != bHash) return false;
    return memcmp(aData->text, bData->text, aData->bytes) == 0;
}

enum FindValueMethod {
    FindExisting,
    FindOrAdd,
    FindAndDelete,
};

Value* findValue(Value object, Value key, FindValueMethod method) {

    Value* keyPtr;
    Value* valuePtr;
    Value* emptySlotKeyPtr = NULL;
    intptr_t jumpSteps = 1;
    int emptyCount = 0;
    int usedCount = 0;

    ObjectData* data = getObjectData(object);
    keyPtr = data->romKeys;
    valuePtr = getObjectSlots(data);

    while (true) {
        Value slotKey = *keyPtr;
        if (slotKey == VALUE_END) {
            break;
        } else if (slotKey == VALUE_ROM_KEYS_END) {
            // Switching from mixed pairs to RAM-only
            emptySlotKeyPtr = NULL; // disallow reuse of any previous empty slot (from ROM)
            keyPtr = valuePtr;
            valuePtr++;
            jumpSteps = 2;
            emptyCount = 0;
            usedCount = 0;
        } else {
            Value slotValue = *valuePtr;
            if (slotValue == VALUE_EMPTY) {
                // Skip deleted slots
                if (emptySlotKeyPtr == NULL) {
                    // Save first deleted slot
                    emptySlotKeyPtr = keyPtr;
                }
                emptyCount++;
            } else if (slotKey == key || stringKeyEq(slotKey, key)) {
                // We got hit
                if (method == FindAndDelete) {
                    if (jumpSteps == 2) {
                        decRef(slotKey);
                        *keyPtr = VALUE_EMPTY;
                    }
                    decRef(slotValue);
                    *valuePtr = VALUE_EMPTY;
                }
                return valuePtr;
            } else {
                // Non-empty slot, so disallow reuse of any previous empty slot
                emptySlotKeyPtr = NULL;
                usedCount++;
            }
            // go to next pair
            keyPtr += jumpSteps;
            valuePtr += jumpSteps;
        }
    }

    // no need to add new key, return immediately
    if (method != FindOrAdd) {
        return NULL;
    }

    // at this point we know that we don't have ROM-only object, so there is no need
    // to convert object to mixed object.

    if (emptySlotKeyPtr == NULL) {
        // if there is no available empty slot at the end, extend the object
        Value* endPtr = (Value*)getObjectEnd(data);
        emptySlotKeyPtr = keyPtr;
        if (emptySlotKeyPtr + 2 >= endPtr) {
            // slot will pass over allocated area, so resize it and calculate new pointer
            if (emptyCount > 8 && emptyCount > usedCount) {
                emptySlotKeyPtr = compactObject(object); // Remove empty RAM-only slots and move the reset, don't reallocate, return pointer to END, it will always success
            } else if (heapAppending(object, 2 * sizeof(Value))) { // Not ready for compacting, so resize it and calculate new pointer
                ObjectData* newData = getObjectData(object);
                emptySlotKeyPtr = (uint8_t*)newData + ((uint8_t*)keyPtr - (uint8_t*)data);
            } else {
                return NULL;
            }
        }
        emptySlotKeyPtr[1] = VALUE_EMPTY;
        emptySlotKeyPtr[2] = VALUE_END;
    }
    incRef(key);
    *emptySlotKeyPtr = key;
    return emptySlotKeyPtr + 1;
}

Value getValue(Value object, Value key) {
    Value* ptr = findValue(object, key, FindExisting);
    if (ptr != NULL) {
        return *ptr;
    } else {
        return VALUE_EMPTY;
    }
}


void setValue(Value object, Value key, Value value) {
    makeMutable(object);
    Value* ptr = findValue(object, key, FindOrAdd);
    if (ptr != NULL) {
        incRef(value);
        decRef(*ptr);
        *ptr = value;
    }
}

void deleteValue(Value object, Value key) {
    makeMutable(object);
    findValue(object, key, FindAndDelete);
}
