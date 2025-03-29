/* License
*/

namespace myapp {
namespace mynamespace {

someStruct a[] = {
    {1, 2, 3},
    {"sdfas", 5, 6},
    {7, 88, 9},
};

other x = {
    .some = 12,
    .other = 13,
};

int arr[] = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    11, 12, 13, 14, 15, 16, 17, 18, 19,
    20};

const char str[] = "This is a stringThis is a stringThis is a string"
 "This is a string" "This is a string"
  "This is a string" "This is a string"
   "This is a string" "This is a string";

class MyClass : public OtherClass, private OtherClass2
{
    protected:
    static const int MyConst = 0;   ///< @brief MyConst
    static const int Myaaa = 1; ///< @brief MyConst
                                ///            This is a comment

    public:
    // a
    // b
    //    c
    // d
    int x;
    private:
    int aaa = 1;
    public:
    int MyProperty;
    const char* ptr;
    char const* ptr;
    const char static *volatile const ptr;
    static inline constexpr int some(int x, int& ref1, int &ref2)
    {
    // some
        f(234234234, gfdkjgdf, dfgsdfg, dfgsdfdf,234234234, gfdkjgdf, dfgsdfg, dfgsdfdf,234234234, gfdkjgdf, dfgsdfg, dfgsdfdf,234234234, gfdkjgdf, dfgsdfg, dfgsdfdf,234234234, gfdkjgdf, dfgsdfg, dfgsdfdf); // This is comment
        auto y = x + 1;
        int xxyz = x + 10;
        int* ptr = NULL;
        int *ptr2 = NULL;
        switch (x) {
            case 1:
            case 10:
                y = 12;
                break;
            case 2:
            {
                y = 11;
                break;
            }
            default:
                return x;
        };
        label:
        if (x * y > 100)
        {
            y = 34 + dfjhsf + 34234 / 234 / a + dfsdf * 34 + dfjhsf + 34234 / 234 / a + dfsdf * 34 + dfjhsf + 34234 / 234 / a + dfsdf * 34 + dfjhsf + 34234 / (234 / a + dfsdf * 34 + dfjhsf + 34234 / 234 / a + dfsdf);
        } else {
            y = y * y;
        }
        if (y > 99) 
                    return x + 1 > 23 
                    ? 3424234 + dsflsjd + fsdf + 3424234 + dsflsjd + fsdf + 3424234 + dsflsjd + fsdf
                     : 54235435 + x;        
        return x * 2 + y;
    };

#pragma region MyRegion

    void f2wesdfs(int a, int b, int c, int d, int e, int f, int g, int h, int i, int j, int k,
            int l, int m, int n, int o, int p, int q)
    {
        // function body
    }
    

#pragma endregion

    bool trf() {
         return true;
        } // function body
};

bool trf() { return true; } // function body

#if Foo

func {
    // function body
}

#define MY_MACRO_LONG(z) z dfs df sdf s df a sdf z dfs df sdf s; df a sdf z dfs df sdf; s df a sdf z dfs df sdf s df a sdf z dfs df sdf s df a sdf z dfs df sdf s df a sdf z dfs df sdf s df; a sdf z dfs df; sdf s df a sdf z dfs df sdf s df a sdf z dfs df sdf s df a; sdf

int aa = 12;

#endif

}
}
