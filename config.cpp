/*
*	Copyright (c) 2011-2012, Dominik Kilian <kontakt@dominik.cc>
*	All rights reserved.
*	See license.txt for details.
*/

#include "stdafx.h"

#include <vector>

#include "config.h"
#include "kody.h"
#include "gesty.h"

void conWrite(wchar_t* str)
{
	HANDLE h = GetStdHandle(STD_OUTPUT_HANDLE);
	if (!h) {
		AllocConsole();
		h = GetStdHandle(STD_OUTPUT_HANDLE);
	}
	DWORD n;
	WriteConsole(h, str, (DWORD)wcslen(str), &n, 0);
}

#define MERROR(params) \
{ \
	wchar_t err[256]; \
	wsprintf params; \
	conWrite(err); \
}

#define MERRORL(len, params) \
{ \
	wchar_t err[(len)]; \
	wsprintf params; \
	conWrite(err); \
}

class Window;
class Gest;

static std::vector<Window*> windows;
Gest* currentGest = 0;
Window* currentWindow = 0;
HWND currentHwnd = 0;
static wchar_t* confFile = 0;


class Action
{
public:
	virtual bool exec() = 0;
	virtual ~Action() { };
};

class KeyAction
	: public Action
{
public:
	int keyCode;
	bool down;
	bool exec() {
		INPUT in;
		memset(&in, 0, sizeof(in));
		in.type = INPUT_KEYBOARD;
		in.ki.wVk = keyCode;
		in.ki.dwFlags = down ? 0 : KEYEVENTF_KEYUP;
		SendInput(1, &in, sizeof(INPUT));
		return true;
	}
};

class MouseAction
	: public Action
{
public:
	int button;
	bool down;
	bool exec() {
		INPUT in;
		memset(&in, 0, sizeof(in));
		in.type = INPUT_MOUSE;
		in.mi.time = ignoreTime;
		if (button == 0 && down)
			in.mi.dwFlags = MOUSEEVENTF_LEFTDOWN;
		else if (button == 0 && !down)
			in.mi.dwFlags = MOUSEEVENTF_LEFTUP;
		else if (button == 1 && down)
			in.mi.dwFlags = MOUSEEVENTF_RIGHTDOWN;
		else if (button == 1 && !down)
			in.mi.dwFlags = MOUSEEVENTF_RIGHTUP;
		else if (button == 2 && down)
			in.mi.dwFlags = MOUSEEVENTF_MIDDLEDOWN;
		else if (button == 2 && !down)
			in.mi.dwFlags = MOUSEEVENTF_MIDDLEUP;
		SendInput(1, &in, sizeof(INPUT));
		return true;
	}
};

class InfoAction
	: public Action
{
public:
	bool exec() {
		wchar_t name[1024];
		int n = GetClassName(currentHwnd, name, 1020);
		if (!n) name[0] = 0;
		MERRORL(1100, (err, L"%s|", name));
		n = GetWindowText(currentHwnd, name, 1020);
		if (!n) name[0] = 0;
		MERRORL(1100, (err, L"%s\r\n", name));
		return true;
	}
};

class Gest;

class GestNode
{
public:
	Gest* next[4];
	GestNode() {
		next[0] = next[1] = next[2] = next[3] = 0;
	}
	~GestNode();
};

class Gest
	: public GestNode
{
public:
	wchar_t* name;
	bool show;
	std::vector<Action*> actions;
	Gest() {
		name = 0;
		show = false;
	}
	~Gest() {
		for (size_t i=0; i<actions.size(); i++) {
			if (actions[i]) delete actions[i];
		}
		actions.clear();
		if (name) delete[] name;
	}
};

GestNode::~GestNode() {
	if (next[0]) delete next[0];
	if (next[1]) delete next[1];
	if (next[2]) delete next[2];
	if (next[3]) delete next[3];
}


class Window
	: public GestNode
{
public:
	wchar_t* className;
	wchar_t* title;
	bool anyClassBegin;
	bool anyClassEnd;
	bool anyTitleBegin;
	bool anyTitleEnd;

	Window() {
		className = 0;
		title = 0;
	}

	~Window() {
		if (className) delete[] className;
		if (title) delete[] title;
	}
};

static void freeConfig()
{
	for (size_t i=0; i<windows.size(); i++) {
		Window* w = windows[i];
		if (w) {
			delete w;
		}
	}
	windows.clear();
	currentGest = 0;
	currentWindow = 0;
}

static bool decode(char* input, wchar_t* output, bool& anyBegin, bool& anyEnd)
{
	wchar_t x;
	int nh;
	anyBegin = false;
	anyEnd = false;
	if (*input) {
		if (*input == '*') {
			anyBegin = true;
			input++;
			if (!*input) {
				anyEnd = true;
				output[0] = 0;
				return true;
			}
		}
		nh = (int)strlen(input);
		if (input[nh-1] == '*') {
			anyEnd = true;
			input[nh-1] = 0;
		}
	}
	while (*input) {
		char c = *input;
		input++;
		if (c == '\\') {
			input++;
			nh = 0;
			switch (input[-1])
			{
			case '\\':
				*output++ = L'\\';
				break;
			case '*':
				*output++ = L'*';
				break;
			case '#':
				*output++ = L'*';
				break;
			case '!':
				*output++ = L'|';
				break;
			case 'r':
				*output++ = L'\r';
				break;
			case 'n':
				*output++ = L'\n';
				break;
			case 't':
				*output++ = L'\t';
				break;
			case 'u':
				nh += 2;
			case 'x':
				nh += 2;
				x = 0;
				for (int i=0; i<nh; i++) {
					x <<= 4;
					if (*input >= '0' && *input <= '9') {
						x += *input - '0';
					} else if (*input >= 'a' && *input <= 'f') {
						x += *input - 'a' + 10;
					} else if (*input >= 'A' && *input <= 'F') {
						x += *input - 'A' + 10;
					} else {
						return false;
					}
					input++;
				}
				if (!x) return false;
				*output++ = x;
				break;
			default:
				return false;
			}
		} else {
			*output++ = (unsigned char)c;
		}
	}
	*output++ = 0;
	return true;
}

static bool createWindow(char* param, int num)
{
	bool anyClassBegin, anyClassEnd, anyTitleBegin, anyTitleEnd;
	char *className, *title;
	wchar_t *classNameW, *titleW;
	className = param;
	title = param;
	while (*title && *title != '|') title++;
	if (!*title) {
		MERROR((err, L"Invalid parameters for window command on line %d\r\n", num));
		return false;
	}
	*title = 0;
	title++;
	classNameW = new wchar_t[strlen(className) + 1];
	titleW = new wchar_t[strlen(title) + 1];
	if (!decode(className, classNameW, anyClassBegin, anyClassEnd)
		|| !decode(title, titleW, anyTitleBegin, anyTitleEnd)) {
		MERROR((err, L"Can not decode string on line %d\r\n", num));
		return false;
	}
	Window* wnd = new Window();
	wnd->className = classNameW;
	wnd->title = titleW;
	wnd->anyClassBegin = anyClassBegin;
	wnd->anyClassEnd = anyClassEnd;
	wnd->anyTitleBegin = anyTitleBegin;
	wnd->anyTitleEnd = anyTitleEnd;
	windows.push_back(wnd);
	currentGest = 0;
	return true;
}

static bool createGest(char* param, int num)
{
	if (windows.size() < 1) {
		MERROR((err, L"Unexpected \"gest\" on line %d\r\n", num));
		return false;
	}
	if (!param[0]) {
		MERROR((err, L"Invalid parameter on line %d\r\n", num));
		return false;
	}
	Window* wnd = windows.back();
	GestNode* cur = wnd;
	while (*param) {
		int p;
		switch (*param) {
			case 'L': case 'l': p = 0; break;
			case 'R': case 'r': p = 1; break;
			case 'U': case 'u': p = 2; break;
			case 'D': case 'd': p = 3; break;
			default:
				MERROR((err, L"Invalid gesture character on line %d\r\n", num));
				return false;
		}
		if (!cur->next[p]) {
			cur->next[p] = new Gest();
		}
		cur = cur->next[p];
		param++;
	}
	Gest* gest = (Gest*)cur;
	if (gest->actions.size()) {
		MERROR((err, L"Gesture repeated on line %d\r\n", num));
		return false;
	}
	currentGest = gest;
	return true;
}

static bool setGestName(char* param, int num)
{
	bool a, b;
	if (!currentGest) {
		MERROR((err, L"Unexpected \"name\" on line %d\r\n", num));
		return false;
	}
	if (currentGest->name) delete[] currentGest->name;
	currentGest->name = new wchar_t[strlen(param) + 1];
	if (!decode(param, currentGest->name, a, b)) {
		MERROR((err, L"Can not decode string on line %d\r\n", num));
		return false;
	}
	return true;
}

static bool setGestShow(char* param, int num)
{
	if (!currentGest) {
		MERROR((err, L"Unexpected \"name\" on line %d\r\n", num));
		return false;
	}
	currentGest->show = true;
	return true;
}

static bool addKeyAction(char* param, bool down, int num)
{
	if (!currentGest) {
		MERROR((err, L"Unexpected keyboard command on line %d\r\n", num));
		return false;
	}
	VK* key = VK::list;
	while (key->name) {
		if (_stricmp(key->name, param) == 0) break;
		key++;
	}
	if (!key->name) {
		MERROR((err, L"Invalid key name on line %d\r\n", num));
		return false;
	}
	KeyAction* act = new KeyAction();
	act->down = down;
	act->keyCode = key->code;
	currentGest->actions.push_back(act);
	return true;
}

static bool addMouseAction(char* param, bool down, int num)
{
	if (!currentGest) {
		MERROR((err, L"Unexpected mouse command on line %d\r\n", num));
		return false;
	}
	int btn = 0;
	if (_stricmp(param, "left") == 0) {
		btn = 0;
	} else if (_stricmp(param, "right") == 0) {
		btn = 1;
	} else if (_stricmp(param, "middle") == 0) {
		btn = 2;
	} else {
		MERROR((err, L"Invalid mouse button on line %d\r\n", num));
		return false;
	}
	MouseAction* act = new MouseAction();
	act->down = down;
	act->button = btn;
	currentGest->actions.push_back(act);
	return true;
}

static bool addInfoAction(char* param, int num)
{
	if (!currentGest) {
		MERROR((err, L"Unexpected mouse command on line %d\r\n", num));
		return false;
	}
	InfoAction* act = new InfoAction();
	currentGest->actions.push_back(act);
	return true;
}

void readConfig()
{
	freeConfig();
	int num = 0;
	char line[1024];
	char *command, *param, *end;
	if (!confFile) {
		confFile = new wchar_t[2048 + 8];
		int n = GetModuleFileName(NULL, confFile, 2048);
		if (n <= 0 || n > 2000) {
			wcscpy(confFile, L"config");
		}
		wcscat(confFile, L".conf");
	}
	FILE* f = _wfopen(confFile, L"r");
	if (!f) {
		MERRORL(2200, (err, L"Can not open configuration file \"%s\"\r\n", confFile));
		return;
	}
	while (!feof(f)) {
		command = fgets(line, 1000, f);
		if (!command) break;
		num++;
		command = line;
		while (*command <= 32 && *command > 0) command++;
		if (*command == 0 || *command == '#') continue;
		param = command;
		while ((BYTE)*param > 32) param++;
		if (*param != 0) {
			*param = 0;
			param++;
			while (*param <= 32 && *param > 0) param++;
		}
		end = param + strlen(param);
		while (end[-1] <= 32 && end[-1] > 0) end--;
		*end = 0;
		//MERROR((err, L"---%S---%S---\r\n", command, param));
		if (_stricmp(command, "window") == 0) {
			if (!createWindow(param, num)) break;
		} else if (_stricmp(command, "gest") == 0) {
			if (!createGest(param, num)) break;
		} else if (_stricmp(command, "name") == 0) {
			if (!setGestName(param, num)) break;
		} else if (_stricmp(command, "down") == 0) {
			if (!addKeyAction(param, true, num)) break;
		} else if (_stricmp(command, "up") == 0) {
			if (!addKeyAction(param, false, num)) break;
		} else if (_stricmp(command, "mousedown") == 0) {
			if (!addMouseAction(param, true, num)) break;
		} else if (_stricmp(command, "mouseup") == 0) {
			if (!addMouseAction(param, false, num)) break;
		} else if (_stricmp(command, "info") == 0) {
			if (!addInfoAction(param, num)) break;
		} else if (_stricmp(command, "show") == 0) {
			if (!setGestShow(param, num)) break;
		} else {
			MERROR((err, L"Unknown command on line %d\r\n", num));
			break;
		}
	}
	fclose(f);
}

static bool match(wchar_t* str, wchar_t* pat, bool anyBegin, bool anyEnd)
{	
	if (!pat[0]) {
		if (str[0] && !anyBegin && !anyEnd) return false;
	} else {
		if (!str[0]) return false;
		if (!anyBegin && !anyEnd) {
			if (wcscmp(str, pat) != 0) return false;
		} else {
			int patLen = (int)wcslen(pat);
			int strLen = (int)wcslen(str);
			if (patLen > strLen) return false;
			if (!anyBegin && anyEnd) {
				if (memcmp(str, pat, patLen) != 0) return false;
			} else if (anyBegin && !anyEnd) {
				if (memcmp(str + strLen - patLen, pat, patLen) != 0) return false;
			} else {
				bool ok = false;
				for (int i=0; i<=strLen-patLen; i++) {
					if (memcmp(str + i, pat, patLen) == 0) {
						ok = true;
						break;
					}
				}
				if (!ok) return false;
			}
		}
	}
	return true;
}

bool selectWindow(HWND win1)
{
	static wchar_t className[1024];
	static wchar_t title[1024];

	if (!win1) return false;
	HWND parent = GetAncestor(win1, GA_ROOT);
	if (parent) win1 = parent;

	int n = GetClassName(win1, className, 1020);
	if (!n) className[0] = 0;
	n = GetWindowText(win1, title, 1020);
	if (!n) title[0] = 0;
	for (size_t i=0; i<windows.size(); i++) {
		Window* win = windows[i];
		if (match(className, win->className, win->anyClassBegin, win->anyClassEnd)
			&& match(title, win->title, win->anyTitleBegin, win->anyTitleEnd))
		{
			currentWindow = win;
			currentHwnd = win1;
			return true;
		}
	}
	currentWindow = 0;
	return false;
}

static Gest* getNode(char* gest, int gestLen)
{
	if (!gestLen || !currentWindow) return 0;
	GestNode* node = currentWindow;
	for (int i=0; i<gestLen; i++) {
		node = node->next[gest[i]];
		if (!node) return 0;
	}
	return (Gest*)node;
}

bool checkGest(char* gest, int gestLen)
{
	if (!gestLen) return true;
	return getNode(gest, gestLen) != 0;
}

bool execGest(char* gest, int gestLen)
{
	Gest* g = getNode(gest, gestLen);
	if (!g) return false;
	if (g->actions.size() < 1) return false;
	for (size_t i=0; i<g->actions.size(); i++) {
		if (!g->actions[i]->exec()) break;
	}
	return true;
}

wchar_t* getGestName(char* gest, int gestLen)
{
	Gest* g = getNode(gest, gestLen);
	if (!g) return 0;
	return g->name;
}

bool getGestShow(char* gest, int gestLen)
{
	Gest* g = getNode(gest, gestLen);
	if (!g) return false;
	return g->show;
}
