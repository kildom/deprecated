
#include <windows.h>


int CALLBACK WinMain(HINSTANCE inst, HINSTANCE prev, LPSTR cmd, int nCmdShow)
{
	char buf[4096];
	char* name;
	char* ptr;
	int numErrors = 1000;

	HANDLE pipe;

	SetPriorityClass(GetCurrentProcess(), HIGH_PRIORITY_CLASS);
	SetThreadPriority(GetCurrentThread(), THREAD_PRIORITY_TIME_CRITICAL);

	strcpy_s(buf, sizeof(buf), cmd);
	name = strstr(buf, "--pipe=");
	if (!name) return 1;
	name += 7;
	ptr = strrchr(name, ' ');
	if (ptr) *ptr = 0;

	pipe = CreateFileA(name, GENERIC_READ, 0, 0, OPEN_EXISTING, 0, 0);

	if (pipe != INVALID_HANDLE_VALUE) {

		char buf[1024];
		DWORD len;

		while (1) {

			if (ReadFile(pipe, buf, 100, &len, 0)) {

				numErrors = 0;

				if (len >= 4) {

					static int oldbtn = 0;
					INPUT input;
					int btn = (unsigned char)buf[0];
					int x = (signed char)buf[1];
					int y = (signed char)buf[2];
					int w = (signed char)buf[3];

					memset(&input, 0, sizeof(input));
					input.type = INPUT_MOUSE;
					input.mi.dx = x;
					input.mi.dy = y;
					input.mi.mouseData = w * WHEEL_DELTA;
					input.mi.dwFlags = 0;
					if (x != 0 || y != 0) input.mi.dwFlags |= MOUSEEVENTF_MOVE;
					if (w != 0) input.mi.dwFlags |= MOUSEEVENTF_WHEEL;
					if ((btn&1) && !(oldbtn&1)) input.mi.dwFlags |= MOUSEEVENTF_LEFTDOWN;
					if (!(btn&1) && (oldbtn&1)) input.mi.dwFlags |= MOUSEEVENTF_LEFTUP;
					if ((btn&2) && !(oldbtn&2)) input.mi.dwFlags |= MOUSEEVENTF_RIGHTDOWN;
					if (!(btn&2) && (oldbtn&2)) input.mi.dwFlags |= MOUSEEVENTF_RIGHTUP;
					if ((btn&4) && !(oldbtn&4)) input.mi.dwFlags |= MOUSEEVENTF_MIDDLEDOWN;
					if (!(btn&4) && (oldbtn&4)) input.mi.dwFlags |= MOUSEEVENTF_MIDDLEUP;

					SendInput(1, &input, sizeof(input));

					oldbtn = btn;
				}

			} else {

				numErrors++;
				if (numErrors > 10) break;
				Sleep(100);

			}
		}

		CloseHandle(pipe);

	}

	if (numErrors > 100) return 3;
	if (numErrors > 10) return 2;

	return 0;
}
