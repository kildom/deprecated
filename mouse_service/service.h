#ifndef service_h
#define service_h

#include <windows.h>

#define nodebuglog

typedef wchar_t wchar;
#define sizeofarray(arr) (sizeof(arr)/sizeof(arr[0]))

#define SER_NAME L"LibUSBMouseFilter"
#define SER_DESC L"LibUSB Based Mouse Event Filter"

int ServiceMain(void);
int ServiceRunning(void);

extern wchar ExeName[4*1024];

#ifndef nodebuglog

void Log(wchar* text);
void LogError(LPTSTR lpszFunction);

#define Logf(text, ...) { wchar_t _tm_buf[1024]; swprintf(_tm_buf, sizeof(_tm_buf), text, ##__VA_ARGS__); Log(_tm_buf); }

#else

#define Log(t)
#define LogError(t)
#define Logf(text, ...)

#endif


#endif
