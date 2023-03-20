
#include <stdint.h>
#include <stdlib.h>
#include <stdbool.h>

/*

Memory organization:
ROM: fixed strings, constants, function declarations in undefined order

HEAP: ||  Object table  |  Object dynamic memory  |  Stack  ||

*/

enum class ValueType {
    Object = (0 << 27),    // Object Index          prototypeIndex32/16, *keys32, *values32
    Accessor = (1 << 27),  // Object Index          getterIndex, setterIndex
    Scope = (2 << 27),     // Object Index          values[2]
    FunctionRuntime = (3 << 27), // Object Index    stack
    Double = (4 << 27),    // Object Index          low32, high32
    String = (5 << 27),    // Object Index          length32/16, bytes32/16, *ptr32
    BigInt = (6 << 27),    // Object Index          
    Native = (7 << 27),    // Object Index          any[]
    None = (8 << 27),      // 0 - empty slot, 1 - end of list
    Undefined = (9 << 27), // none
    Null = (10 << 27),      // none
    Boolean = (11 << 27),   // 0, 1
    Integer = (12 << 27),   // -2^27 .. 2^27-1
};

enum Flags {
    ROM = (1 << 31), // Object index points to offset in ROM where const object is located
    Configurable = (1 << 24),
    Enumerable = (1 << 25),
    Writable = (1 << 26),
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
