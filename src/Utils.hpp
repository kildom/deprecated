#pragma once

#include <cstdint>
#include <string>
#include <memory>


template <typename T>
using SP = std::shared_ptr<T>;

template <typename T>
using UP = std::unique_ptr<T>;

template <typename T>
using WP = std::weak_ptr<T>;

using bytes = std::basic_string<std::uint8_t>;
using string = std::string;


class SharedBase : public std::enable_shared_from_this<SharedBase>  {
public:
    virtual ~SharedBase() = default;
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
