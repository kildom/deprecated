/*
*	Copyright (c) 2011-2012, Dominik Kilian <kontakt@dominik.cc>
*	All rights reserved.
*	See license.txt for details.
*/

#include "stdafx.h"
#include <string.h>
#include <math.h>

#include <vector>

#include "gesty.h"
#include "config.h"

#define WCPRINT(params) { }

#ifndef WCPRINT
#define WCPRINT(params) \
{	\
	wchar_t wcp[4*1024]; \
	wsprintf params; \
	DWORD _wcp_n = 0; \
	WriteConsole(GetStdHandle(STD_OUTPUT_HANDLE), wcp, wcslen(wcp), &_wcp_n, NULL); \
}
#define DO_ALLOC_CON
#endif

#define WM_ICON (WM_USER + 1)

#define STEP 12
#define MUL 1.5f

DWORD ignoreTime = 0;
bool captured = false;
int startX, startY;
int curX, curY;

int gestX, gestY;
char gestLong[1024];
int gestLongLen;
char gestShort[1024];
int gestShortLen;

wchar_t* oldPopupText = 0;

void showPopup(wchar_t* text, wchar_t* title = L"");

void gestCreateShort()
{
	if (gestLongLen < 2) {
		gestShortLen = 0;
		return;
	}
	int maxRep = 0;
	int curRep = 0;
	char last = 0x7F;
	for (int i=0; i<gestLongLen; i++) {
		char c = gestLong[i];
		if (last != c) {
			if (curRep > maxRep) maxRep = curRep;
			curRep = 0;
		}
		last = c;
		curRep++;
	}
	if (curRep > maxRep) maxRep = curRep;
	maxRep /= 7;
	if (maxRep < 1) maxRep = 1;
	if (maxRep > 3) maxRep = 3;
	last = 0x7F;
	curRep = 0;
	gestShortLen = 0;
	for (int i=0; i<gestLongLen; i++) {
		char c = gestLong[i];
		if (last != c) {
			if (curRep > maxRep && last != 0x7F && (gestShortLen == 0 || gestShort[gestShortLen-1] != last)) {
				gestShort[gestShortLen++] = last;
			}
			curRep = 0;
		}
		last = c;
		curRep++;
	}
	if (curRep > maxRep && last != 0x7F && (gestShortLen == 0 || gestShort[gestShortLen-1] != last)) {
		gestShort[gestShortLen++] = last;
	}
}

bool start(MSLLHOOKSTRUCT* info)
{
	gestX = 0;
	gestY = 0;
	gestLongLen = 0;
	gestCreateShort();
	oldPopupText = 0;

	HWND win1, win2;

	int n = 0;
	
	while (true) {

		win1 = WindowFromPoint(info->pt);
		win2 = GetForegroundWindow();
		
		if (!win1) return false;
		HWND parent = GetAncestor(win1, GA_ROOT);
		if (parent) win1 = parent;

		if (!win2) return false;
		parent = GetAncestor(win2, GA_ROOT);
		if (parent) win2 = parent;

		if (win1 != win2) {
			if (n++ > 5) return false;
			// TODO: Je¿eli ¿adne z okien nie pasuje, to nie ma sensu ustawiania jako okna pierwszoplanowego
			SetForegroundWindow(win1);
			Sleep(10);
		} else {
			break;
		}
	}

	//HWND win = ChildWindowFromPointEx(GetDesktopWindow(), info->pt, CWP_SKIPINVISIBLE | CWP_SKIPTRANSPARENT);
	//HDC dc = GetDC(0); MoveToEx(dc, info->pt.x, info->pt.y, 0); LineTo(dc, info->pt.x-3, info->pt.y-3);
	if (selectWindow(win1)) {
		ignoreTime = info->time - 3;
		captured = true;
		curX = startX = info->pt.x;
		curY = startY = info->pt.y;
		showPopup(L"");
		return true;
	}
	return false;
}

void sendMouseInput(int x, int y, DWORD flags)
{
	RECT rect;
	INPUT in;
	HWND win = GetDesktopWindow();
	GetWindowRect(win, &rect);
	rect.right -= rect.left;
	rect.bottom -= rect.top;
	memset(&in, 0, sizeof(in));
	in.type = INPUT_MOUSE;
	in.mi.dx = (x * 65536) / rect.right;
	in.mi.dy = (y * 65536) / rect.bottom;
	in.mi.dwExtraInfo = 0;
	in.mi.dwFlags = MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_VIRTUALDESK | flags;
	in.mi.time = ignoreTime;
	SendInput(1, &in, sizeof(in));
}

bool gestStep(int dx, int dy)
{
	//HDC dc = GetDC(0); MoveToEx(dc, curX - dx, curY - dy, 0); LineTo(dc, curX, curY);
	gestX += dx;
	gestY += dy;
	int d = gestX*gestX + gestY*gestY;
	while (d >= STEP*STEP) {
		float id = 1.0f / sqrt((float)d);
		float nx = (float)gestX * id;
		float ny = (float)gestY * id;
		char dir = 0x7F;
		if (nx > MUL*fabs(ny)) {
			dir = 1;
		} else if (nx < -MUL*fabs(ny)) {
			dir = 0;
		} else if (ny > MUL*fabs(nx)) {
			dir = 3;
		} else if (ny < -MUL*fabs(nx)) {
			dir = 2;
		}
		if (dir != 0x7F && gestLongLen < sizeof(gestLong)-1) {
			gestLong[gestLongLen++] = dir;
			gestCreateShort();
			if (!checkGest(gestShort, gestShortLen)) {
				return false;
			}
		}
		wchar_t buf[256]; for (int i=0; i<gestShortLen; i++) buf[i] = gestShort[i] + '0'; buf[gestShortLen] = 0; WCPRINT((wcp, L"%s\r\n", buf));
		gestX -= (int)(nx * (float)STEP + 0.5f);
		gestY -= (int)(ny * (float)STEP + 0.5f);
		d = gestX*gestX + gestY*gestY;
	}
	return true;
}

HHOOK oldHook;

bool lButton, mButton;

LRESULT CALLBACK proc(int nCode, WPARAM wParam, LPARAM lParam)
{
	int msg = (int)wParam;
	MSLLHOOKSTRUCT* info = (MSLLHOOKSTRUCT*)lParam;

	if (nCode != HC_ACTION || info->time == ignoreTime) {
		return CallNextHookEx(oldHook, nCode, wParam, lParam);
	}

	if (captured) {

		//WCPRINT((wcp, L"BUFFERED: %d %d\r\n", info->pt.x, info->pt.y));

		/*
		U¿ytkownik puœci³ przycisk
		  Gest poprawny				- Nie wykonuj wciœniêcia, wykonaj zdarzenie
		  Gest niepoprawny			- Wyœlij wciœniêcie, przenieœ do koñcowego i puszczenie
		Niepoprawny pocz¹tek gestu	- Wyœlij wciœniêcie i przenieœ do koñcowego
		Inne zdarzenie				- Wyœlij wciœniêcie i wyœlij bezpoœrednio aktualne
		*/

		WCPRINT((wcp, L"Captured message %x\r\n", msg));

		switch (msg) 
		{
		case WM_MOUSEMOVE:
			{
				int dx = info->pt.x - startX;
				int dy = info->pt.y - startY;

				curX += dx;
				curY += dy;

				if (!gestStep(dx, dy)) {
					captured = false;
					sendMouseInput(startX, startY, MOUSEEVENTF_RIGHTDOWN);
					sendMouseInput(curX, curY, MOUSEEVENTF_MOVE);
					showPopup(L"");
				} else {
					wchar_t* na = getGestName(gestShort, gestShortLen);
					if (na != oldPopupText) {
						showPopup(na ? na : L"");
						oldPopupText = na;
					}
				}
				
				return 1;
			}
			break;

		case WM_RBUTTONUP:
			{
				WCPRINT((wcp, L"R Up\r\n"));
				captured = false;
				if (!execGest(gestShort, gestShortLen)) {
					WCPRINT((wcp, L"Not executed 1\r\n"));
					sendMouseInput(startX, startY, MOUSEEVENTF_RIGHTDOWN);
					sendMouseInput(curX, curY, MOUSEEVENTF_MOVE);
					sendMouseInput(curX, curY, MOUSEEVENTF_RIGHTUP);
					WCPRINT((wcp, L"Not executed 2\r\n"));
					showPopup(L"");
				} else {
					sendMouseInput(curX, curY, MOUSEEVENTF_MOVE);
					wchar_t* na = getGestName(gestShort, gestShortLen);
					if (na) {
						if (getGestShow(gestShort, gestShortLen)) {
							wchar_t info[256];
							static wchar_t str[256] = L"";
							if (!str[0]) {
								LoadString(hInst, IDS_EXECUTED, str, 200);
							}
							WCPRINT((wcp, L"Executed %s\r\n", na));
							wcscpy_s(info, 250, str);
							wcscat_s(info, 255, na);
							showPopup(info);
						} else {
							showPopup(L"");
						}
					} else {
						WCPRINT((wcp, L"Executed NULL\r\n"));
						showPopup(L"");
					}
				}
				return 1;
			}
			break;

		default:
			WCPRINT((wcp, L"Unexpected interrupt\r\n"));
			captured = false;
			sendMouseInput(startX, startY, MOUSEEVENTF_RIGHTDOWN);
		}

	} else {

		switch (msg)
		{
		case WM_RBUTTONDOWN:
			WCPRINT((wcp, L"R down\r\n"));
			if (!lButton && !mButton && start(info)) return 1;
			WCPRINT((wcp, L"R down canceled\r\n"));
			break;
		case WM_LBUTTONDOWN:
			lButton = true;
			break;
		case WM_LBUTTONUP:
			lButton = false;
			break;
		case WM_MBUTTONDOWN:
			mButton = true;
			break;
		case WM_MBUTTONUP:
			mButton = false;
			break;
		}

	}

	return CallNextHookEx(oldHook, nCode, wParam, lParam);
}

HINSTANCE hInst;
TCHAR szTitle[] = L"Gestures";
TCHAR szWindowClass[] = L"GesturesWindowClass";
HWND hWnd;
HMENU menu;

ATOM MyRegisterClass(HINSTANCE hInstance);
BOOL InitInstance(HINSTANCE, int);
LRESULT CALLBACK WndProc(HWND, UINT, WPARAM, LPARAM);
void destroyInstance();

int APIENTRY _tWinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPTSTR lpCmdLine, int nCmdShow)
{
	UNREFERENCED_PARAMETER(hPrevInstance);
	UNREFERENCED_PARAMETER(lpCmdLine);

	MSG msg;

	MyRegisterClass(hInstance);

	if (!InitInstance (hInstance, nCmdShow)) {
		return 1;
	}

	readConfig();

#ifdef DO_ALLOC_CON
	AllocConsole();
#endif

	oldHook = SetWindowsHookEx(WH_MOUSE_LL, proc, 0, 0);

	while (GetMessage(&msg, NULL, 0, 0))
	{
		TranslateMessage(&msg);
		DispatchMessage(&msg);
	}

	destroyInstance();

	return (int) msg.wParam;
}


ATOM MyRegisterClass(HINSTANCE hInstance)
{
	WNDCLASSEX wcex;
	wcex.cbSize = sizeof(WNDCLASSEX);
	wcex.style			= CS_HREDRAW|CS_VREDRAW;
	wcex.lpfnWndProc	= WndProc;
	wcex.cbClsExtra		= 0;
	wcex.cbWndExtra		= 0;
	wcex.hInstance		= hInstance;
	wcex.hIcon			= 0;
	wcex.hCursor		= LoadCursor(NULL, IDC_ARROW);
	wcex.hbrBackground	= (HBRUSH)(COLOR_WINDOW+1);
	wcex.lpszMenuName	= 0;
	wcex.lpszClassName	= szWindowClass;
	wcex.hIconSm		= 0;
	return RegisterClassEx(&wcex);
}

BOOL InitInstance(HINSTANCE hInstance, int nCmdShow)
{
	hInst = hInstance;
	hWnd = CreateWindow(szWindowClass, szTitle, WS_OVERLAPPEDWINDOW,
		CW_USEDEFAULT, 0, CW_USEDEFAULT, 0, NULL, NULL, hInstance, NULL);
	if (!hWnd)
	{
		return FALSE;
	}
#ifdef DO_ALLOC_CON
	ShowWindow(hWnd, nCmdShow);
#endif
	UpdateWindow(hWnd);
	return TRUE;
}

void showIcon(HWND hWnd)
{
	NOTIFYICONDATA data;
	memset(&data, 0, sizeof(data));
	data.cbSize = sizeof(data);
	data.hWnd = hWnd;
	data.uID = WM_ICON;
	data.uFlags = NIF_ICON | NIF_TIP | NIF_MESSAGE;
	data.uCallbackMessage = WM_ICON;
	data.hIcon = LoadIcon(hInst, MAKEINTRESOURCE(IDI_SMALL));
	LoadString(hInst, IDS_TOOLTIP, data.szTip, 63);
	Shell_NotifyIcon(NIM_ADD, &data);
	menu = LoadMenu(hInst, MAKEINTRESOURCE(IDR_MENU));
}

void showPopup(wchar_t* text, wchar_t* title)
{
	NOTIFYICONDATA data;
	memset(&data, 0, sizeof(data));
	data.cbSize = sizeof(data);
	data.hWnd = hWnd;
	data.uID = WM_ICON;
	data.uFlags = NIF_INFO;
	wcscpy_s(data.szInfo, 250, text);
	data.uTimeout = 1000;
	wcscpy_s(data.szInfoTitle, 64, title);
	data.dwInfoFlags = NIIF_INFO;
	Shell_NotifyIcon(NIM_MODIFY, &data);
	Shell_NotifyIcon(NIM_MODIFY, &data);
}

void destroyInstance()
{
	NOTIFYICONDATA data;
	memset(&data, 0, sizeof(data));
	data.cbSize = sizeof(data);
	data.hWnd = hWnd;
	data.uID = WM_ICON;
	Shell_NotifyIcon(NIM_DELETE, &data);
}

LRESULT CALLBACK WndProc(HWND hWnd, UINT message, WPARAM wParam, LPARAM lParam)
{
	int wmId, wmEvent;

	switch (message)
	{

	case WM_ICON:
		if (LOWORD(lParam) == WM_RBUTTONUP) {
			POINT p;
			GetCursorPos(&p);
			TrackPopupMenuEx(GetSubMenu(menu, 0), TPM_NOANIMATION, p.x, p.y, hWnd, NULL);
		} else if (LOWORD(lParam) == WM_RBUTTONDOWN) {
			SetForegroundWindow(hWnd);
		}
		break;

	case WM_COMMAND:
		wmId    = LOWORD(wParam);
		wmEvent = HIWORD(wParam);
		switch (wmId)
		{
		case ID_RELOAD:
			readConfig();
			break;
		case ID_CLOSE:
			DestroyWindow(hWnd);
			break;
		default:
			return DefWindowProc(hWnd, message, wParam, lParam);
		}
		break;

	case WM_CREATE:
		showIcon(hWnd);
		break;

	/*case WM_PAINT:
		hdc = BeginPaint(hWnd, &ps);
		EndPaint(hWnd, &ps);
		break;*/

	case WM_DESTROY:
		PostQuitMessage(0);
		break;

	default:
		return DefWindowProc(hWnd, message, wParam, lParam);
	}
	return 0;
}

