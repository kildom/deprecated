#pragma once

#include <cstdint>
#include <cstring>
#include <string>
#include <memory>
#include <concepts>


template <typename T>
using SP = std::shared_ptr<T>;

template <typename T>
using UP = std::unique_ptr<T>;

template <typename T>
using WP = std::weak_ptr<T>;


template <typename T>
struct BasicStringParseHelper {};

template <>
struct BasicStringParseHelper<uint32_t> {
    static uint32_t parse(const BytesView &source) {
        if (source.size < 4) {
            //throw std::runtime_error("Not enough data to parse uint32_t");
        }
        return *(uint32_t*)source.data();
    }
};

template <typename T>
requires std::integral<T>
struct BasicStringParseHelper<T> {
    static T parse(const BytesView &source) {
        if (source.size < sizeof(T)) {
            // throw
        }
        return *(T*)source.data();
    }
};

template <typename T>
class BasicStringView
{
public:
    BasicStringView(): buffer(), offset(0), size(0) {}
    BasicStringView(size_t size): buffer(std::make_shared<std::basic_string<T>>(size)), offset(0), size(size) {}
    BasicStringView(size_t size, size_t capacity): buffer(std::make_shared<std::basic_string<T>>(capacity)), offset(0), size(size) {}
    BasicStringView(const BasicStringView &other) = default;
    BasicStringView(BasicStringView &&other) = default;
    BasicStringView(const SP<std::basic_string<T>> &buffer, size_t offset = 0, ssize_t size = -1):
        buffer(buffer),
        offset(offset),
        size(size < 0 ? (buffer ? buffer->size() : 0) - offset : size_t(size))
    {
    }

    SP<std::basic_string<T>> buffer;
    size_t offset;
    size_t size;

    T* data() noexcept {
        if (buffer) {
            return buffer->data() + offset;
        }
        return nullptr;
    }

    const T* data() const noexcept {
        if (buffer) {
            return buffer->data() + offset;
        }
        return nullptr;
    }

    BasicStringView<T> prepareAppend(size_t appendSize, int growFactor = 8) {
        if (!buffer) {
            buffer = std::make_shared<std::basic_string<T>>(appendSize);
        }
        if (offset + size + appendSize > buffer->size()) {
            auto newSize = std::max(buffer->size() * (16 + growFactor) / 16, offset + size + appendSize);
            buffer->resize(newSize);
            if (buffer->capacity() > buffer->size()) {
                buffer->resize(buffer->capacity());
            }
        }
        return BasicStringView<T>(buffer, offset + size, appendSize);
    }

    void append(const BasicStringView<T> &other, int growFactor = 8) {
        auto appendSize = other.size;
        if (!buffer) {
            buffer = std::make_shared<std::basic_string<T>>(appendSize);
        }
        if (offset + size + appendSize > buffer->size()) {
            auto newSize = std::max(buffer->size() * (16 + growFactor) / 16, offset + size + appendSize);
            buffer->resize(newSize);
            if (buffer->capacity() > buffer->size()) {
                buffer->resize(buffer->capacity());
            }
        }
        std::memmove(buffer->data() + offset + size, other.data(), appendSize);
        size += appendSize;
    }

    template<typename U>
    U parse() {
        return BasicStringParseHelper<U>::parse(*this);
    }
};

using bytes = std::basic_string<std::uint8_t>;
using string = std::string;
using BytesView = BasicStringView<std::uint8_t>;
using StringView = BasicStringView<char>;


class SharedBase : public std::enable_shared_from_this<SharedBase>  {
public:
    virtual ~SharedBase() = default;

    template <typename T = SharedBase>
    SP<T> shared_from_this() {
        return std::static_pointer_cast<T>(std::enable_shared_from_this<SharedBase>::shared_from_this());
    }
};


template <typename T>
struct _TypeIdHelper
{
    static const uint8_t dummy;
};

template <typename T>
const uint8_t _TypeIdHelper<T>::dummy;


template <typename T>
uintptr_t getTypeId()
{
    return reinterpret_cast<uintptr_t>(&_TypeIdHelper<T>::dummy);
}



class AnyContainer // TODO: This is not significantly better than std::any, consider using std::any instead
{
private:

    struct HolderBase {
        virtual ~HolderBase() = default;
    };

    template <typename T>
    struct Holder: public HolderBase {
        T value;
        uintptr_t typeId;
    };

    HolderBase* holder;

public:
    AnyContainer(): holder(nullptr) {}
    AnyContainer(const AnyContainer &) = delete;
    AnyContainer(AnyContainer &&other): holder(other.holder) {
        other.holder = nullptr;
    }
    ~AnyContainer() { 
        if (holder != nullptr) {
            delete holder;
        }
    }

    AnyContainer& operator=(const AnyContainer &) = delete;
    AnyContainer& operator=(AnyContainer &&other) {
        if (holder != nullptr) {
            delete holder;
        }
        holder = other.holder;
        other.holder = nullptr;
        return *this;
    }

    template <typename T>
    void set(const T &value) {
        if (holder != nullptr) {
            delete holder;
        }
        holder = new Holder<T>{value, getTypeId<T>()};
    }

    template <typename T>
    T* get() {
        if (holder == nullptr || static_cast<Holder<T>*>(holder)->typeId != getTypeId<T>()) {
            return nullptr;
        }
        return &static_cast<Holder<T>*>(holder)->value;
    }

    template <typename T>
    bool is() {
        return holder != nullptr && static_cast<Holder<T>*>(holder)->typeId == getTypeId<T>();
    }

    operator bool() const {
        return holder != nullptr;
    }

    bool operator!() const {
        return holder == nullptr;
    }

    template <typename T>
    AnyContainer& operator=(const T &value) {
        set(value);
        return *this;
    }

};

/** @brief Returns the number of milliseconds of the current monotonic time.
 * 
 * This clock counts running time, so if the system goes to sleep, the returned value does not increase
 * during that time.
 */
uint64_t getRunTimeMs();
