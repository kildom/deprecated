#ifndef UNICODE
#define UNICODE
#endif 

#include <windows.h>

#include <stdio.h>
#include <stdbool.h>

#include "interface.h"

LRESULT CALLBACK WindowProc(HWND hwnd, UINT uMsg, WPARAM wParam, LPARAM lParam);

HANDLE thread;

CRITICAL_SECTION cs;

#define ENTER() EnterCriticalSection(&cs)
#define LEAVE() LeaveCriticalSection(&cs)

DWORD WINAPI threadStart(LPVOID data)
{
    mainLoop();
    return 0;
}

uint64_t lastRealTime = 0;
uint32_t lastSimuTime = 0;
double simuSpeed = 1.0;
double simuRemaining = 0.0;

#define TICKS_PER_SECOND 1000.0

uint32_t getTime()
{
    FILETIME t1, t2;
    FILETIME kernel, user;
    ULARGE_INTEGER conv;
    ENTER();
    double speed = simuSpeed;
    LEAVE();
    GetThreadTimes(thread, &t1, &t2, &kernel, &user);
    conv.LowPart = user.dwLowDateTime;
    conv.HighPart = user.dwHighDateTime;
    uint64_t realTime = conv.QuadPart;
    //conv.LowPart = kernel.dwLowDateTime;
    //conv.HighPart = kernel.dwHighDateTime;
    //realTime += conv.QuadPart;
    if (lastRealTime == 0) lastRealTime = realTime;
    if (lastRealTime == realTime) return lastSimuTime;
    double realStep = realTime - lastRealTime;
    lastRealTime = realTime;
    double simuStep = realStep / 10000000.0 * TICKS_PER_SECOND * speed + simuRemaining;
    uint32_t simuStepInt = simuStep;
    simuRemaining = simuStep - (double)simuStepInt;
    lastSimuTime += simuStep;
    return lastSimuTime;
}

int WINAPI wWinMain(HINSTANCE hInstance, HINSTANCE res1, PWSTR pCmdLine, int nCmdShow)
{
    // Register the window class.
    const wchar_t CLASS_NAME[]  = L"Sample Window Class";

    InitializeCriticalSection(&cs);
    
    WNDCLASS wc = { };

    wc.lpfnWndProc   = WindowProc;
    wc.hInstance     = hInstance;
    wc.lpszClassName = CLASS_NAME;
    wc.hCursor = LoadCursor(NULL, IDC_ARROW); 

    RegisterClass(&wc);

    // Create the window.

    HWND hwnd = CreateWindowEx(
        0,                              // Optional window styles.
        CLASS_NAME,                     // Window class
        L"Simu",    // Window text
        WS_OVERLAPPEDWINDOW,            // Window style

        // Size and position
        CW_USEDEFAULT, CW_USEDEFAULT, 200, 150,

        NULL,       // Parent window    
        NULL,       // Menu
        hInstance,  // Instance handle
        NULL        // Additional application data
        );

    if (hwnd == NULL)
    {
        return 0;
    }

    ShowWindow(hwnd, nCmdShow);

    // Run the message loop.

    thread = CreateThread(NULL, 0, threadStart, NULL, 0, NULL);

    MSG msg = { };
    while (GetMessage(&msg, NULL, 0, 0))
    {
        TranslateMessage(&msg);
        DispatchMessage(&msg);
    }

    return 0;
}

#define SEG_UP 1
#define SEG_MID 2
#define SEG_DOWN 4
#define SEG_UPL 8
#define SEG_UPR 16
#define SEG_DOWNL 32
#define SEG_DOWNR 64
#define SEG_DP 128

int segs[][4] = {
    {20, 0, 45, 0}, // ^
    {10, 30, 35, 30}, // -
    {0, 60, 25, 60}, // _
    {15, 5, 10, 25}, // ^<
    {45, 5, 40, 25}, // >^
    {5, 35, 0, 55}, // _<
    {35, 35, 30, 55}, // >_
    {38, 55, 33, 65}, // .
};

int icons[][16] = {
    {0,0},
    {-150,-55,170,55,170,35,150,35,150,55,-160,-55,160,35},
    {-150,-15,155,10,-170,-30,160,20,170,10},
    {-150,-80,170,80,160,60,150,80},
    {0,0},
    {-10,-60,30,60,20,80,10,60},
    {-10,-55,30,35,-10,-35,30,55},
    {-10,-30,30,20,10,10,10,30}
};

void paintDigit(HDC hdc, int x, int y, int bits)
{
    int i;
    for (i = 0; i < 8 && bits != 0; i++)
    {
        if (bits & 1)
        {
            MoveToEx(hdc, x + segs[i][0], y + segs[i][1], NULL);
            LineTo(hdc, x + segs[i][2], y + segs[i][3]);
        }
        bits >>= 1;
    }
}

void paintIcons(HDC hdc, int bits)
{
    int i, j;
    for (i = 0; i < 8 && bits != 0; i++)
    {
        if (bits & 1)
        {
            for (j = 0; j < 16; j += 2)
            {
                if (icons[i][j] == 0) continue;
                if (icons[i][j] < 0)
                {
                    MoveToEx(hdc, -icons[i][j], -icons[i][j+1], NULL);
                }
                else
                {
                    LineTo(hdc, icons[i][j], icons[i][j+1]);
                }
            }
        }
        bits >>= 1;
    }
}


HDC Memhdc = NULL;
HBITMAP Membitmap;
int old_width = 0;
int old_height = 0;

void paint(HWND hwnd)
{
    RECT Client_Rect;
	GetClientRect(hwnd, &Client_Rect);
	int win_width = Client_Rect.right - Client_Rect.left;
	int win_height = Client_Rect.bottom + Client_Rect.left;
	PAINTSTRUCT ps;
	HDC hdc;
	hdc = BeginPaint(hwnd, &ps);
    if (Memhdc != NULL && (old_width != win_width || old_height != win_height))
    {
        DeleteObject(Membitmap);
        DeleteDC    (Memhdc);
        Memhdc = NULL;
        printf("%d %d\r\n", win_height, win_width);
    }
    old_width = win_width;
    old_height = win_height;
    if (Memhdc == NULL)
    {
        Memhdc = CreateCompatibleDC(hdc);
        Membitmap = CreateCompatibleBitmap(hdc, win_width, win_height);
        SelectObject(Memhdc, Membitmap);
    }
    FillRect(Memhdc, &ps.rcPaint, (HBRUSH) (COLOR_WINDOW+1));
    paintDigit(Memhdc, 45, 15, rand());
    paintDigit(Memhdc, 90, 15, rand());
    paintIcons(Memhdc, rand());
    wchar_t buf[1024];
    swprintf(buf, 1024, L"%c %C%C %0.1f%%", L'P', L'▲', L'▼', 45.3);
    RECT r;
    r.left = 10;
    r.top = 90;
    r.right = win_width;
    r.bottom = win_height;
    MoveToEx(Memhdc, 0, 88, NULL);
    LineTo(Memhdc, win_width, 88);
    DrawTextW(Memhdc, buf, -1, &r, DT_LEFT | DT_TOP |DT_SINGLELINE);
	BitBlt(hdc, 0, 0, win_width, win_height, Memhdc, 0, 0, SRCCOPY);
	EndPaint(hwnd, &ps);
}

static int keyPulses[] = {0,0,0};

void updateKey(int i, bool pressed)
{
    static bool state[] = { false, false, false };
    if (pressed == state[i]) return;
    state[i] = pressed;
    ENTER();
    keyPulses[i]++;
    LEAVE();
}

uint8_t getButtonPulse(uint8_t buttonIndex)
{
    ENTER();
    uint8_t n = keyPulses[buttonIndex];
    if (n > 0) keyPulses[buttonIndex]--;
    LEAVE();
    return n > 0;
}

LRESULT CALLBACK WindowProc(HWND hwnd, UINT uMsg, WPARAM wParam, LPARAM lParam)
{
    switch (uMsg)
    {
    case WM_DESTROY:
        PostQuitMessage(0);
        return 0;

    case WM_PAINT:
        paint(hwnd);
        return 0;

    case WM_KEYDOWN:
        if (1 & (lParam >> 30)) break;
        switch (wParam)
        {
            case VK_RETURN: updateKey(0, true); break;
            case VK_UP: updateKey(1, true); break;
            case VK_DOWN: updateKey(2, true); break;
        }
        break;

    case WM_KEYUP:
        switch (wParam)
        {
            case VK_RETURN: updateKey(0, false); break;
            case VK_UP: updateKey(1, false); break;
            case VK_DOWN: updateKey(2, false); break;
        }
        break;

    }
    return DefWindowProc(hwnd, uMsg, wParam, lParam);
}