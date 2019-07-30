/*
*	Copyright (c) 2012, Dominik Kilian <kontakt@dominik.cc>
*	All rights reserved.
*	See license.txt for details.
*/

#include "stdafx.h"

struct ThreadData
{
	int client;
	volatile float debt;
	HANDLE ev;
	ThreadData* next;
	ThreadData* prev;

	ThreadData(int cli) {
		enter();
		client = cli;
		debt = 0.0f;
		ev = CreateEvent(NULL, FALSE, FALSE, NULL);
		next = list;
		prev = 0;
		if (list) list->prev = this;
		list = this;
		count++;
		leave();
	}
	
	~ThreadData()
	{
		enter();
		CloseHandle(ev);
		if (next) next->prev = prev;
		if (prev) prev->next = next;
		if (list == this) list = next;
		count--;
		leave();
	}

	static volatile int count;
	static ThreadData* volatile list;
	static CRITICAL_SECTION sec;
	static void enter() { EnterCriticalSection(&sec); }
	static void leave() { LeaveCriticalSection(&sec); }

};

volatile int ThreadData::count = 0;
ThreadData* volatile ThreadData::list = 0;
CRITICAL_SECTION ThreadData::sec;

float limit;
int port_in;
char* serv_name;
char* log_file;
int serv_port;
sockaddr_in serv_addr;


char logBuffer[128*1024];
int logLength;
CRITICAL_SECTION logSec;
DWORD logSaveTime;
bool logInitialized = false;
#define LOG_SAVE_INTERVAL (5*60*1000)

#define LOG_ERROR(text) puts(text); log(text "\r\n"); logForce();
#define LOG_ERRORC(text, c) puts(text); log(text "\r\n", c); logForce();

bool saveToLog(char** data, int* size)
{
	HANDLE file = CreateFileA(log_file, GENERIC_WRITE, FILE_SHARE_READ, NULL, OPEN_ALWAYS, FILE_ATTRIBUTE_NORMAL, NULL);
	if (file == INVALID_HANDLE_VALUE) return false;
	if (SetFilePointer(file, 0, NULL, FILE_END) == INVALID_SET_FILE_POINTER) {
		CloseHandle(file);
		return false;
	}
	while (*data) {
		char* d = *data++;
		int s = *size++;
		DWORD n;
		WriteFile(file, d, s, &n, NULL);
	}
	CloseHandle(file);
	logSaveTime = GetTickCount();
	return true;
}

void logForce()
{
	if (!log_file) return;
	EnterCriticalSection(&logSec);
	char* strs[3] = { logBuffer, 0 };
	int lens[3] = { logLength, 0 };
	if (saveToLog(strs, lens)) {
		logLength = 0;
	}
	LeaveCriticalSection(&logSec);
}

void checkLogTimeout(DWORD tick)
{
	if (!log_file) return;
	EnterCriticalSection(&logSec);
	if (logLength > 0) {
		DWORD t = tick - logSaveTime;
		if (t > LOG_SAVE_INTERVAL) {
			char* strs[3] = { logBuffer, 0 };
			int lens[3] = { logLength, 0 };
			if (saveToLog(strs, lens)) {
				logLength = 0;
			}
		}
	}
	LeaveCriticalSection(&logSec);
}

void log(char* text, int client = 0)
{
	if (!log_file) return;
	if (!logInitialized) {
		logLength = 0;
		InitializeCriticalSection(&logSec);
		logInitialized = true;
		logSaveTime = GetTickCount() - LOG_SAVE_INTERVAL - 2;
	}
	int len = strlen(text);
	SYSTEMTIME st;
	GetLocalTime(&st);
	char dateStr[48];
	if (client) {
		sprintf_s<sizeof(dateStr)>(dateStr, "%d-%02d-%02d %02d:%02d:%02d.%03d : %08x : ", (int)st.wYear, (int)st.wMonth,
			(int)st.wDay, (int)st.wHour, (int)st.wMinute, (int)st.wSecond, (int)st.wMilliseconds, client);
	} else {
		sprintf_s<sizeof(dateStr)>(dateStr, "%d-%02d-%02d %02d:%02d:%02d.%03d : ", (int)st.wYear, (int)st.wMonth,
			(int)st.wDay, (int)st.wHour, (int)st.wMinute, (int)st.wSecond, (int)st.wMilliseconds);
	}
	int dateLen = strlen(dateStr);
	EnterCriticalSection(&logSec);
	if (len + logLength > (sizeof(logBuffer)*3)/4) {
		char* strs[4] = { logBuffer, dateStr, text, 0 };
		int lens[4] = { logLength, dateLen, len, 0 };
		if (saveToLog(strs, lens)) {
			logLength = 0;
		} else {
			if (len + logLength > sizeof(logBuffer)) {
				char* str = "\r\n=========== Log buffer overrun!!! ===========\r\n\r\n";
				strcpy_s<sizeof(logBuffer)>(logBuffer, str);
				logLength = strlen(str);
			} else {
				memcpy(logBuffer + logLength, dateStr, dateLen);
				logLength += dateLen;
				memcpy(logBuffer + logLength, text, len);
				logLength += len;
			}
		}
	} else {
		memcpy(logBuffer + logLength, dateStr, dateLen);
		logLength += dateLen;
		memcpy(logBuffer + logLength, text, len);
		logLength += len;
	}
	LeaveCriticalSection(&logSec);
	checkLogTimeout(GetTickCount());
//	logForce();
}


float max_debt;
#define BUFFER_LENGTH (2800)
#define TIMEOUT (5*60*1000)

DWORD WINAPI tunnel(LPVOID lpParameter)
{

	int client = (int)lpParameter;
	ThreadData data(client);

	int server = socket(AF_INET, SOCK_STREAM, 0);
	if (server < 0) {
		LOG_ERRORC("Can not create client socket", client);
		shutdown(client, SD_BOTH);
		closesocket(client);
		return 0;
	}

	if (connect(server, (sockaddr*)&serv_addr, sizeof(sockaddr_in)) != 0) {
		LOG_ERRORC("Can not connect to server", client);
		shutdown(client, SD_BOTH);
		closesocket(server);
		closesocket(client);
		return 0;
	}
	
	int r;
	HANDLE events[2];
	char buf[BUFFER_LENGTH];
	events[0] = WSACreateEvent();
	events[1] = WSACreateEvent();
	DWORD lastEvent = GetTickCount();
	DWORD startTime = lastEvent;
	int nSend = 0;
	int nRecv = 0;

	if (events[0] == WSA_INVALID_EVENT || events[1] == WSA_INVALID_EVENT) {
		LOG_ERRORC("Can not create WSA Event", client);
		WSACloseEvent(events[0]);
		WSACloseEvent(events[1]);
		closesocket(server);
		closesocket(client);
	}

	do {
		DWORD t = GetTickCount();
		if (t - lastEvent > TIMEOUT) break;

		if (WSAEventSelect(client, events[0], FD_READ | FD_CLOSE)
			|| WSAEventSelect(server, events[1], FD_READ | FD_CLOSE))
		{
			break;
		}
		DWORD obj = WaitForMultipleObjects(2, events, FALSE, 1000);

		if (obj == WAIT_OBJECT_0 || obj == WAIT_OBJECT_0 + 1) {
			ResetEvent(events[obj - WAIT_OBJECT_0]);

			int from, to;
			if (obj == WAIT_OBJECT_0) {
				from = client;
				to = server;
			} else {
				from = server;
				to = client;
			}

			r = recv(from, buf, BUFFER_LENGTH, 0);
			if (r <= 0) {
				if (WSAGetLastError() == WSAEWOULDBLOCK) {
					continue;
				} else {
					break;
				}
			}

			if (obj == WAIT_OBJECT_0) {
				for (int i = 0; i < r-10; i++) {
					if (buf[i+9] == '\r'  && buf[i+10] == '\n'
						&& memcmp(buf + i, " HTTP/1.", 8) == 0
						&& (buf[i+8] == '0' || buf[i+8] == '1'))
					{
						int j = i;
						while (j > 0 && buf[j-1] != '\n') j--;
						buf[i] = '\r';
						buf[i+1] = '\n';
						buf[i+2] = 0;
						log(buf + j, client);
						buf[i] = ' ';
						buf[i+1] = 'H';
						buf[i+2] = 'T';
					}
				}
				nRecv += r;
			} else {
				nSend += r;
			}

			ThreadData::enter();
			while (data.debt > max_debt) {
				ThreadData::leave();
				if (data.ev) {
					WaitForSingleObject(data.ev, 1000);
				} else {
					Sleep(100);
				}
				t = GetTickCount();
				if (t - lastEvent > TIMEOUT) break;
				ThreadData::enter();
			}
			data.debt += float(r);
			ThreadData::leave();

			lastEvent = t;

			int num = r;
			int pos = 0;
			DWORD nb = 0;
			WSAEventSelect(to, 0, 0);
			ioctlsocket(to, FIONBIO, &nb);
			while (pos < num) {
				r = send(to, buf + pos, num - pos, 0);
				if (r <= 0) break;
				pos += r;
			}
			if (r <= 0) break;
		}

	} while (true);

	WSACloseEvent(events[0]);
	WSACloseEvent(events[1]);

	shutdown(server, SD_BOTH);
	closesocket(server);
	shutdown(client, SD_BOTH);
	closesocket(client);

	startTime = GetTickCount() - startTime;
	sprintf_s<sizeof(buf)>(buf, "Client closed, recived %0.2fKB, sended %0.2fKB, time %0.3fs, speed %0.2fKB/s\r\n",
		double(nRecv) / 1024.0, double(nSend) / 1024.0,
		double(startTime) / 1000.0,
		double(nRecv+nSend) / double(startTime) * 1.024);
	log(buf, client);

	return 0;
}


DWORD WINAPI provider(LPVOID lpParameter)
{
	DWORD lastTick = GetTickCount();
	while (true) {
		ThreadData* cur;
		DWORD t = GetTickCount();
		DWORD per = t - lastTick;
		float forSpend = limit * float(per) * 1.024f;
		lastTick = t;
		checkLogTimeout(t);
		for (int i=0; i<4 && forSpend > 1.0f; i++) {
			ThreadData::enter();
			int num = 0;
			for (cur = ThreadData::list; cur; cur = cur->next) {
				if (cur->debt > 0.0f) num++;
			}
			if (num > 0) {
				float p = forSpend / float(num);
				for (cur = ThreadData::list; cur; cur = cur->next) {
					if (cur->debt > p) {
						forSpend -= p;
						cur->debt -= p;
					} else {
						forSpend -= cur->debt;
						cur->debt = 0.0f;
					}
				}
			}
			ThreadData::leave();
		}
		ThreadData::enter();
		for (cur = ThreadData::list; cur; cur = cur->next) {
			if (cur->ev) SetEvent(cur->ev);
		}
		ThreadData::leave();
		Sleep(100);
	}
	return 0;
}


void handleClient(int client)
{
	HANDLE cth = CreateThread(NULL, 0, tunnel, (LPVOID)client, 0, NULL);
	if (!cth) {
		closesocket(client);
		LOG_ERRORC("Can not create client thread", client);
	} else {
		CloseHandle(cth);
	}
}

bool startServer()
{
    int sock = socket(AF_INET, SOCK_STREAM, 0);
    if (sock < 0) {
		LOG_ERROR("Can not create server socket");
		return false;
    }

    sockaddr_in dest_addr;
    memset(&dest_addr, 0, sizeof(sockaddr_in));
    dest_addr.sin_family = AF_INET;
    dest_addr.sin_port = htons(port_in);
    dest_addr.sin_addr.s_addr = INADDR_ANY;

    if (bind(sock, (sockaddr*) &dest_addr, sizeof(sockaddr)) < 0) {
        closesocket(sock);
		LOG_ERROR("Can not bind server socket");
		return false;
    }

	if (listen(sock, 10) < 0) {
		closesocket(sock);
		LOG_ERROR("Can not listen server socket");
		return false;
	}

	HANDLE pth = CreateThread(NULL, 0, provider, 0, 0, NULL);
	if (!pth)  {
		closesocket(sock);
		LOG_ERROR("Can not create provider thread");
		return false;
	}
	CloseHandle(pth);

	int numerr = 0;
	do {
		sockaddr_in adres;
		int client;
		int size = sizeof(adres);
		if ((client = accept(sock, (sockaddr*)&adres, &size)) < 0) {
			numerr++;
			if (numerr > 300) {
				closesocket(sock);
				LOG_ERROR("Too many accept errors");
				return false;
			}
			continue;
		}
		char buf[48];
		sprintf_s<sizeof(buf)>(buf, "Client %d.%d.%d.%d:%d accepted\r\n",
			(int)adres.sin_addr.S_un.S_un_b.s_b1,
			(int)adres.sin_addr.S_un.S_un_b.s_b2,
			(int)adres.sin_addr.S_un.S_un_b.s_b3,
			(int)adres.sin_addr.S_un.S_un_b.s_b4,
			(int)adres.sin_port);
		log(buf, client);
		handleClient(client);
	} while (true);

	return true;
}

bool getServer()
{		
	memset(&serv_addr, 0, sizeof(serv_addr));
	serv_addr.sin_family = AF_INET;
    serv_addr.sin_port = htons((u_short)serv_port);
    serv_addr.sin_addr.s_addr = inet_addr(serv_name);
    if (serv_addr.sin_addr.s_addr == INADDR_NONE) {
        hostent* host;
        host = gethostbyname(serv_name);
        if (host == NULL) {
			LOG_ERROR("Can not find server!");
			return false;
        }
        memcpy(&serv_addr.sin_addr, host->h_addr, sizeof(serv_addr.sin_addr));
    }
	return true;
}


int usage()
{
	puts("USAGE: tcplimit limit_KBps port_in serv_name serv_port [debt_KB] [log_file]");
	puts("");
	puts("                       tcplimit                serv_name");
	puts("                 +------------------+      +---------------+");
	puts("        >--------------\\ limit_KBps |   serv_port          |");
	puts("CLIENTS >    port_in    >===========================>      |");
	puts("        >--------------/            |      |               |");
	puts("                 +------------------+      +---------------+");
	puts("");
	return 1;
}


int main(int argc, char* argv[])
{

	if (argc != 5 && argc != 6 && argc != 7) return usage();

	limit = float(atof(argv[1]));
	if (limit <= 0.0f)  return usage();

	port_in = atoi(argv[2]);
	if (port_in <= 0 || port_in >= 65536)  return usage();

	serv_name = argv[3];

	serv_port = atoi(argv[4]);
	if (serv_port <= 0 || serv_port >= 65536)  return usage();

	if (argc > 5) {
		max_debt = float(atoi(argv[5])) * 1024.0f;
		if (max_debt <= 1)  return usage();
	} else {
		max_debt = 16000.0f;
	}

	if (argc > 6) {
		log_file = argv[6];
	} else {
		log_file = 0;
	}

    WSADATA d;
    WSAStartup(2,&d);
	InitializeCriticalSection(&ThreadData::sec);

	log("=============================================\r\n");
	log("               TCP limit started\r\n");
	log("=============================================\r\n");
	logForce();

	if (!getServer()) {
		WSACleanup();
		return 2;
	}

	if (!startServer()) {
		WSACleanup();
		return 3;
	}

	WSACleanup();
	return 0;
}

