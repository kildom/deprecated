
#include <coroutine>
#include <stdio.h>


void* my_alloc(int x);
void my_free(void*, int x);

void* my_test(void* ptr);

template<typename T>
struct MyPromiseType;

template<typename T>
struct MyPromisePtr {
    using TT = MyPromiseType<T>;
    MyPromiseType<T>* ptr;
    MyPromisePtr(MyPromiseType<T>* ptr): ptr(ptr) {};

    bool await_ready() { return false; }


    void await_suspend(std::coroutine_handle<> h)
    {
        my_test(ptr);
        my_test(h.address());
    }

    T await_resume() { return 0; }
};

template<typename T>
struct MyPromiseType {

    void return_value(T value) {
        printf("return_value\n");
    }

    //static int get_return_object_on_allocation_failure() noexcept { return 0; }

    MyPromisePtr<T> get_return_object() { return this; }
    void unhandled_exception() {}

    std::suspend_never initial_suspend() noexcept { return {}; }
    std::suspend_never final_suspend() noexcept { return {}; }

    // custom non-throwing overload of new
    void* operator new(std::size_t n) noexcept
    {
        return my_alloc(n);
    }

    // custom non-throwing overload of new
    void operator delete(void* buf, std::size_t n) noexcept
    {
        //my_free(buf, n);
    }
};

namespace std {

template<typename T>
struct coroutine_traits<MyPromisePtr<T>>
{
    using promise_type = MyPromisePtr<T>::TT;
};
};

MyPromisePtr<int> f() {
    co_return 1;
}


MyPromisePtr<int> g() {
    co_return co_await f() + co_await f() + co_await f() + co_await f() + co_await f() + co_await f() + co_await f();
}

