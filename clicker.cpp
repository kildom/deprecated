/*
*	Copyright (c) 2011, Dominik Kilian <kontakt@dominik.cc>
*	All rights reserved.
*	See license.txt for details.
*/

#include "stdafx.h"

#include <windows.h>

enum CommandType {
	cmdReset,
	cmdDown,
	cmdUp,
	cmdClick,
	cmdOver,
	cmdWait,
	cmdShow,
	cmdHelp,
	cmdRun,
	cmdExit,
	cmdBreak,
	cmdNull
};

void help()
{
	puts("\nClicker v2\n");
	puts("Polecenia:");
	puts("  reset             - wyczysc liste zadan");
	puts("  down [l|r|m]      - wcisnij przycisk tutaj");
	puts("  up [l|r|m]        - podnies przycisk tutaj");
	puts("  click [l|r|m] [t] - kliknij przyciskiem tutaj przytrzymujac przez okres t");
	puts("  over              - przesun kursor tutaj");
	puts("  wait [t]          - odczekaj okres t");
	puts("  show              - pokaz liste zadan");
	puts("  help              - pokaz liste polecen");
	puts("  run [n] [s]       - wykonaj liste zadan n razy i z jednostka czasu s");
	puts("  break [d]         - zmien przesuniecie myszki, ktore powoduje zatrzymanie");
	puts("  exit              - zakoncz program\n");
	puts("Parametry:");
	puts("  [l|r|m]           - lewy, prawy, srodkowy klawisz myszy (domyslnie lewy)");
	puts("  [t]               - okres czasu (domyslnie 1.0) w jednostkach podanych w run");
	puts("  [n]               - ilosc wykonan calej listy polecen (domyslnie 1)");
	puts("  [s]               - jednostka czasu w sek. (domyslnie 1.0)");
	puts("  [d]               - przesuniecie liczone w pikselach (domyslnie 3)\n");
}

struct CommandText {
	CommandType cmd;
	char* text;
};

CommandText cmdText[] = {
	{ cmdReset, "reset\0" },
	{ cmdDown, "down\0d\0" },
	{ cmdUp, "up\0u\0" },
	{ cmdClick, "click\0c\0" },
	{ cmdOver, "over\0o\0" },
	{ cmdWait, "wait\0w\0" },
	{ cmdShow, "show\0s\0" },
	{ cmdHelp, "help\0?\0" },
	{ cmdRun, "run\0r\0" },
	{ cmdBreak, "break\0b\0" },
	{ cmdExit, "exit\0x\0" },
	{ cmdNull, 0 },
};

void strtolower(char* str)
{
	while (*str) {
		if (*str >= 'A' && *str <= 'Z') *str -= 'A' - 'a';
		str++;
	}
}

int expectedX = -1;
int expectedY = -1;
int maxDistance = 3;

bool positionValid()
{
	if (expectedX < 0 || expectedX < 0) return true;
	POINT p;
	GetCursorPos(&p);
	int d = max(abs(expectedX - p.x), abs(expectedY - p.y));
	return d < maxDistance;
}

void positionSet(int x, int y)
{
	expectedX = x;
	expectedY = y;
	SetCursorPos(x, y);
}

void positionReset()
{
	expectedX = expectedY = -1;
}

class Task
{
public:
	virtual bool exec(float s);
	virtual void show();
	virtual ~Task();
};

bool Task::exec(float s)
{
	return true;
}

void Task::show()
{
}

Task::~Task()
{
}

class WaitTask
	: public Task
{
public:
	float t;
	WaitTask(float t);
	bool exec(float s);
	void show();
};

WaitTask::WaitTask(float t)
{
	WaitTask::t = t;
}

bool WaitTask::exec(float s)
{
	DWORD ms = (DWORD)(s * t * 1000.0 + 0.5);
	if (ms < 1) ms = 1;
	Sleep(ms);
	return true;
}

void WaitTask::show()
{
	printf("wait %0.3f\n", t);
}

class ButtonTask
	: public Task
{
public:
	CommandType type;
	int x;
	int y;
	char btn;
	float t;
	ButtonTask(CommandType type, char btn = 0, float t = 1.0);
	void getPos();
	void show();
	bool exec(float s);
};

ButtonTask::ButtonTask(CommandType type, char btn, float t)
{
	ButtonTask::type = type;
	ButtonTask::btn = btn;
	ButtonTask::t = t;
	getPos();
}

void ButtonTask::getPos()
{
	POINT p;
	GetCursorPos(&p);
	x = p.x;
	y = p.y;
}

void ButtonTask::show()
{
	char *text = 0;
	switch (type)
	{
	case cmdDown:
		text = "down";
	case cmdUp:
		if (!text) text = "up";
		printf("%s %c at %d x %d\n", text, btn, x, y);
		break;
	case cmdClick:
		printf("click %c for %0.3f at %d x %d\n", btn, t, x, y);
		break;
	case cmdOver:
		printf("over %d x %d\n", x, y);
		break;
	}
}

bool ButtonTask::exec(float s)
{

	INPUT inp;

	DWORD ms = (DWORD)(s * t * 1000.0 + 0.5);
	if (ms < 1) ms = 1;

	if (!positionValid()) return false;
	positionSet(x, y);
	Sleep(1);
	if (!positionValid()) return false;

	inp.type = INPUT_MOUSE;
	inp.mi.time = 0;
	inp.mi.mouseData = 0;
	inp.mi.dwExtraInfo = 0;

	static DWORD me[] = {
		MOUSEEVENTF_LEFTDOWN, MOUSEEVENTF_RIGHTDOWN, MOUSEEVENTF_MIDDLEDOWN,
		MOUSEEVENTF_LEFTUP, MOUSEEVENTF_RIGHTUP, MOUSEEVENTF_MIDDLEUP,
	};

	int ev = btn == 'l' ? 0 : (btn == 'r' ? 1 : 2);

	switch (type)
	{
	case cmdUp:
		ev += 3;
	case cmdDown:
		inp.mi.dwFlags = me[ev] | MOUSEEVENTF_VIRTUALDESK;
		SendInput(1, &inp, sizeof(inp));
		break;
	case cmdClick:
		inp.mi.dwFlags = me[ev] | MOUSEEVENTF_VIRTUALDESK;
		SendInput(1, &inp, sizeof(inp));
		Sleep(ms);
		inp.mi.dwFlags = me[ev + 3] | MOUSEEVENTF_VIRTUALDESK;
		SendInput(1, &inp, sizeof(inp));
		break;
	}

	return true;
}

bool end = false;

Task* list[1024];
int listLength = 0;

void execCommand(CommandType cmd, char* params)
{
	char strParam[1024];
	float dParam;
	int iParam;
	if (*params == ' ') params++;
	if (*params > '\0' && *params <= ' ') *params = '\0';
	//printf("-- %d %s\n", (int)cmd, params);
	switch (cmd)
	{
	case cmdReset:
		for (int i=0; i<listLength; i++) {
			delete list[i];
		}
		listLength = 0;
		break;
	case cmdDown:
	case cmdUp:
		strParam[0] = 'l';
		strParam[1] = 0;
		sscanf(params, "%s", strParam);
		strtolower(strParam);
		if (strParam[0] != 'l' && strParam[0] != 'r' && strParam[0] != 'm') {
			puts("Nieprawidlowy przycisk!");
			break;
		}
		list[listLength++] = new ButtonTask(cmd, strParam[0]);
		break;
	case cmdClick:
		strParam[0] = 'l';
		strParam[1] = 0;
		dParam = 1.0;
		sscanf(params, "%s %f", strParam, &dParam);
		strtolower(strParam);
		if (strParam[0] != 'l' && strParam[0] != 'r' && strParam[0] != 'm') {
			puts("Nieprawidlowy przycisk!");
			break;
		}
		list[listLength++] = new ButtonTask(cmd, strParam[0], dParam);
		break;
	case cmdOver:
		list[listLength++] = new ButtonTask(cmd);
		break;
	case cmdWait:
		dParam = 1.0;
		sscanf(params, "%f", &dParam);
		list[listLength++] = new WaitTask(dParam);
		break;
	case cmdShow:
		if (listLength == 0) {
			puts("Pusta");
		}
		for (int i=0; i<listLength; i++) {
			printf("%3d  ", i+1);
			list[i]->show();
		}
		break;
	case cmdRun:
		iParam = 1;
		dParam = 1.0;
		sscanf(params, "%d %f", &iParam, &dParam);
		positionReset();
		for (int n=0; n<iParam; n++) {
			printf("\r%d of %d    ", n+1, iParam);
			for (int i=0; i<listLength; i++) {
				bool res = list[i]->exec(dParam);
				if (!res && !positionValid()) n = iParam;
			}
		}
		printf("\nDone               \n");
		break;
	case cmdBreak:
		iParam = 3;
		sscanf(params, "%d", &iParam);
		maxDistance = iParam;
		if (maxDistance < 1) maxDistance = 1;
		break;
	case cmdHelp:
		help();
		break;
	case cmdExit:
		end = true;
		break;
	}
}

int main()
{
	bool executed;
	char line[2048];
	char cmd[2048];

	help();

	while (!end) {
		printf(">>> ");
		gets(line);
		sscanf(line, "%s", cmd);
		strtolower(cmd);
		if (!*cmd) continue;
		CommandText* t = cmdText;
		executed = false;
		while (t->text && !executed) {
			char* text = t->text;
			while (*text && !executed) {
				if (strcmp(text, cmd) == 0) {
					execCommand(t->cmd, line + strlen(cmd));
					executed = true;
				}
				text += strlen(text) + 1;
			}
			t++;
		}
		if (!executed) {
			puts("Nieznane polecenie. Wpisz help, aby uzyskac liste polecen.");
		}
	}

	return 0;
}

/*
int main()
{

	INPUT inp;
	POINT ps;
	POINT p;

	inp.type = INPUT_MOUSE;
	inp.mi.time = 0;
	inp.mi.mouseData = 0;
	inp.mi.dwExtraInfo = 0;

	GetCursorPos(&ps);

	while (1) {

		GetCursorPos(&p);
		if (p.x != ps.x || p.y != ps.y)
			break;

		inp.mi.dwFlags = MOUSEEVENTF_LEFTDOWN | MOUSEEVENTF_VIRTUALDESK;
		SendInput(1, &inp, sizeof(inp));

		Sleep(20);

		inp.mi.dwFlags = MOUSEEVENTF_LEFTUP | MOUSEEVENTF_VIRTUALDESK;
		SendInput(1, &inp, sizeof(inp));

		Sleep(20);

	};

	return 0;
}
*/