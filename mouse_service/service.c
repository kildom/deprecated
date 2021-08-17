
#include "stdafx.h"
#include "service.h"

wchar ServiceName[] = SER_NAME;
wchar ServiceDisplayName[] = SER_DESC;

wchar ExeName[4*1024];

int LogToFile = 1;

#ifndef nodebuglog

wchar LogName[4*1024] = L"";

void Log(wchar* text)
{
	FILE* f;
	if (LogToFile) {
		if (!LogName[0]) {
			wcscpy(LogName, ExeName);
			wcscat(LogName, L".log");
		}
		f = _wfopen(LogName, L"ab");
		if (!f) return;
		fwrite(text, 2, wcslen(text), f);
		fclose(f);
	} else {
		fputws(text, stdout);
	}
}

void LogError(LPTSTR lpszFunction) 
{ 
	TCHAR szBuf[800]; 
	LPVOID lpMsgBuf;
	DWORD dw = GetLastError(); 

	FormatMessage(
		FORMAT_MESSAGE_ALLOCATE_BUFFER | 
		FORMAT_MESSAGE_FROM_SYSTEM,
		NULL,
		dw,
		MAKELANGID(LANG_NEUTRAL, SUBLANG_DEFAULT),
		(LPTSTR) &lpMsgBuf,
		0, NULL );

	wsprintf(szBuf, 
		L"%s failed with error %d: %s\n", 
		lpszFunction, dw, lpMsgBuf); 

	Log(szBuf);

	LocalFree(lpMsgBuf);

}

#endif

void InstallService(void) 
{

	wchar_t command[4096 + 10];

	SC_HANDLE schSCManager;
	SC_HANDLE schService;

	Log(L"Instaling service\n");

	schSCManager = OpenSCManager( 
		NULL,                    // local machine 
		NULL,                    // ServicesActive database 
		SC_MANAGER_ALL_ACCESS);  // full access rights 

	if (NULL == schSCManager) {
		LogError(L"OpenSCManager");
		return;
	}

	wcscpy(command, ExeName);
	wcscat(command, L" -s");

	schService = CreateService(
		schSCManager,              // SCManager database 
		ServiceName,               // name of service 
		ServiceDisplayName,        // service name to display 
		SERVICE_ALL_ACCESS,        // desired access 
		SERVICE_WIN32_OWN_PROCESS | SERVICE_INTERACTIVE_PROCESS, // service type 
		SERVICE_AUTO_START,      // start type 
		SERVICE_ERROR_NORMAL,      // error control type 
		command,                   // path to service's binary 
		NULL,                      // no load ordering group 
		NULL,                      // no tag identifier 
		NULL,                      // no dependencies 
		NULL,                      // LocalSystem account 
		NULL);                     // no password 

	if (schService == NULL) {
		LogError(L"CreateService");
		CloseServiceHandle(schSCManager);
		return;
	}

	StartService(schService, 0, NULL);

	CloseServiceHandle(schService); 
	CloseServiceHandle(schSCManager);

}

void RemoveService(void) 
{
	DWORD x;
	SERVICE_STATUS_PROCESS st;
	SERVICE_STATUS status;
	SC_HANDLE schSCManager;
	SC_HANDLE schService;

	Log(L"Removing service\n");

	schSCManager = OpenSCManager( 
		NULL,                    // local machine 
		NULL,                    // ServicesActive database 
		SC_MANAGER_ALL_ACCESS);  // full access rights 

	if (NULL == schSCManager) {
		LogError(L"OpenSCManager");
		return;
	}

	schService = OpenService(
		schSCManager,
		ServiceName,
		SC_MANAGER_ALL_ACCESS);

	if (schService == NULL) {
		LogError(L"OpenService");
		CloseServiceHandle(schSCManager);
		return;
	}

	ControlService(schService, SERVICE_CONTROL_STOP, &status);

	Log(L"Waitig for stop\n");

	do {

		if (!QueryServiceStatusEx(schService, SC_STATUS_PROCESS_INFO, (BYTE*)&st, sizeof(SERVICE_STATUS_PROCESS), &x)) {
			LogError(L"QueryServiceStatusEx");
			CloseServiceHandle(schService);
			CloseServiceHandle(schSCManager);
			return;
		}

	} while (st.dwCurrentState != SERVICE_STOPPED);

	Log(L"Stopped\n");

	if (!DeleteService(schService)) {
		LogError(L"DeleteService");
	}

	CloseServiceHandle(schService);
	CloseServiceHandle(schSCManager);

}


volatile SERVICE_STATUS ServiceStatus;
SERVICE_STATUS_HANDLE   hStatus; 


void ControlHandler(DWORD request) 
{ 
   switch(request) 
   { 
      case SERVICE_CONTROL_STOP: 
         Log(L"Monitoring stopped.\n");

         ServiceStatus.dwWin32ExitCode = 0; 
         ServiceStatus.dwCurrentState = SERVICE_STOPPED; 
         SetServiceStatus (hStatus, (LPSERVICE_STATUS)&ServiceStatus);
         return; 
 
      case SERVICE_CONTROL_SHUTDOWN: 
         Log(L"Monitoring stopped.\n");

         ServiceStatus.dwWin32ExitCode = 0; 
         ServiceStatus.dwCurrentState = SERVICE_STOPPED; 
         SetServiceStatus (hStatus, (LPSERVICE_STATUS)&ServiceStatus);
         return; 
        
      default:
         break;
    } 
 
    // Report current status
    SetServiceStatus (hStatus, (LPSERVICE_STATUS)&ServiceStatus);
 
    return; 
}

int InitService() 
{ 
	return 0;
}


VOID WINAPI ServiceFunc(DWORD dwArgc, LPTSTR* lpszArgv)
{

	int error; 

	ServiceStatus.dwServiceType = SERVICE_WIN32; 
	ServiceStatus.dwCurrentState = SERVICE_START_PENDING; 
	ServiceStatus.dwControlsAccepted = SERVICE_ACCEPT_STOP | SERVICE_ACCEPT_SHUTDOWN;
	ServiceStatus.dwWin32ExitCode = 0; 
	ServiceStatus.dwServiceSpecificExitCode = 0; 
	ServiceStatus.dwCheckPoint = 0; 
	ServiceStatus.dwWaitHint = 0; 

	hStatus = RegisterServiceCtrlHandler(ServiceName, (LPHANDLER_FUNCTION)ControlHandler); 

	if (hStatus == (SERVICE_STATUS_HANDLE)0) 
	{ 
		Log(L"Registering Control Handler failed\n");
		return; 
	}  

	error = InitService(); 
	if (error) 
	{
		ServiceStatus.dwCurrentState = SERVICE_STOPPED; 
		ServiceStatus.dwWin32ExitCode = -1; 
		SetServiceStatus(hStatus, (LPSERVICE_STATUS)&ServiceStatus); 
		Log(L"Initialization failed\n");
		return; 
	} 

	ServiceStatus.dwCurrentState = SERVICE_RUNNING; 
	SetServiceStatus(hStatus, (LPSERVICE_STATUS)&ServiceStatus);

	SetPriorityClass(GetCurrentProcess(), ABOVE_NORMAL_PRIORITY_CLASS);
	SetThreadPriority(GetCurrentThread(), THREAD_PRIORITY_ABOVE_NORMAL);

	ServiceMain();

	if (ServiceStatus.dwCurrentState != SERVICE_STOPPED) {
		ServiceStatus.dwCurrentState = SERVICE_STOPPED; 
		SetServiceStatus(hStatus, (LPSERVICE_STATUS)&ServiceStatus);
	}

	return; 
}

int ServiceRunning(void)
{
	return ServiceStatus.dwCurrentState == SERVICE_RUNNING;
}

void usage()
{
	printf("%s",
		"\n"
		"-i        intall and start service\n"
		"-r        remove service\n"
		"-s        start process as service (done internally)\n\n"
		);
}

int main(int argc, char* argv[])
{

	LogToFile = 1;

	if (!GetModuleFileName(NULL, ExeName, sizeofarray(ExeName)))
		return 1;

	Log(L"Starting process: ");
	Log(ExeName);
	Log(L"\n");

	if (argc < 2) {

		char opt[128];

		usage();

		printf("Select instant action: [I]nstall/[R]emove service? ");
		scanf("%s", opt);
		if (strlen(opt) != 1) opt[0] = 0;

		switch (opt[0])
		{
		case 'i':
		case 'I':
			InstallService();
			break;
		case 'r':
		case 'R':
			RemoveService();
			break;
		default:
			printf("Unknown command\n");
			break;
		}

		printf("\n");
		system("pause");

	} else if (argc == 2 && strcmp(argv[1], "-i") == 0) {

		//LogToFile = false;
		InstallService();

	} else if (argc == 2 && strcmp(argv[1], "-r") == 0) {

		//LogToFile = false;
		RemoveService();

	} else if (argc == 2 && strcmp(argv[1], "-s") == 0) {

		SERVICE_TABLE_ENTRYW tab[2];

		Log(L"Starting service\n");

		tab[0].lpServiceName = ServiceName;
		tab[0].lpServiceProc = ServiceFunc;
		tab[1].lpServiceName = NULL;
		tab[1].lpServiceProc = NULL;

		StartServiceCtrlDispatcher(tab);

	} else {

		Log(L"args Error\n");

		usage();

	}

	Log(L"End of main\n");

	return 0;
}

