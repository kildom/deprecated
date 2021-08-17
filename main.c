/*
*	Copyright (c) 2012, Dominik Kilian <kontakt@dominik.cc>
*	All rights reserved.
*	See license.txt for details.
*/

#include <stdio.h>
#include <string.h>
#include <windows.h>
#include <shellapi.h>


#define checkShow(name) if (_wcsicmp(showCmd, L#name) == 0) { show = name; } else

#define USAGE \
	L"StartShellExecute file [/V verb] [/P parameters] [/D directory] [/S show_command] [/Q]\n" \
	L"\n" \

void usage()
{
	wprintf(L"%s\n", USAGE);
}

int mymain(wchar_t** argv, int argc)
{
	int i;
	int show = SW_SHOW;
	wchar_t* operation = NULL;
	wchar_t* file = NULL;
	wchar_t* params = NULL;
	wchar_t* dir = NULL;
	wchar_t* showCmd = NULL;
	int q = 0;
	for (i=1; i<argc; i++) {
		if (_wcsicmp(argv[i], L"/v") == 0) {
			if (i+1 >= argc || operation) break;
			operation = argv[++i];
		} else if (_wcsicmp(argv[i], L"/p") == 0) {
			if (i+1 >= argc || params) break;
			params = argv[++i];
		} else if (_wcsicmp(argv[i], L"/d") == 0) {
			if (i+1 >= argc || dir) break;
			dir = argv[++i];
		} else if (_wcsicmp(argv[i], L"/s") == 0) {
			if (i+1 >= argc || showCmd) break;
			showCmd = argv[++i];
		} else if (_wcsicmp(argv[i], L"/q") == 0) {
			q = 1;
		} else if (argv[i][0] == L'/') {
			if (!q) usage();
			return 1;
		} else {
			file = argv[i];
		}
	}
	if (i < argc || !file) {
		if (!q) usage();
		return 1;
	}
	if (showCmd) {
		checkShow(SW_HIDE)
		checkShow(SW_SHOWNORMAL)
		checkShow(SW_NORMAL)
		checkShow(SW_SHOWMINIMIZED)
		checkShow(SW_SHOWMAXIMIZED)
		checkShow(SW_MAXIMIZE)
		checkShow(SW_SHOWNOACTIVATE)
		checkShow(SW_SHOW)
		checkShow(SW_MINIMIZE)
		checkShow(SW_SHOWMINNOACTIVE)
		checkShow(SW_SHOWNA)
		checkShow(SW_RESTORE)
		checkShow(SW_SHOWDEFAULT)
		checkShow(SW_FORCEMINIMIZE)
		checkShow(SW_MAX)
		{
			if (!q) usage();
			return 1;
		}
	}
	i = (int)ShellExecute(NULL, operation, file, params, dir, show);
	if (i <= 32) {
		switch (i) {
			case 0: file = L"The operating system is out of memory or resources."; break;
			case ERROR_BAD_FORMAT: file = L"The .exe file is invalid (non-Microsoft Win32 .exe or error in .exe image)."; break;
			case SE_ERR_ACCESSDENIED: file = L"The operating system denied access to the specified file."; break;
			case SE_ERR_ASSOCINCOMPLETE: file = L"The file name association is incomplete or invalid."; break;
			case SE_ERR_DDEBUSY: file = L"The Dynamic Data Exchange (DDE) transaction could not be completed because other DDE transactions were being processed."; break;
			case SE_ERR_DDEFAIL: file = L"The DDE transaction failed."; break;
			case SE_ERR_DDETIMEOUT: file = L"The DDE transaction could not be completed because the request timed out."; break;
			case SE_ERR_DLLNOTFOUND: file = L"The specified DLL was not found."; break;
			case SE_ERR_FNF: file = L"The specified file was not found."; break;
			case SE_ERR_NOASSOC: file = L"There is no application associated with the given file name extension. This error will also be returned if you attempt to print a file that is not printable."; break;
			case SE_ERR_OOM: file = L"There was not enough memory to complete the operation."; break;
			case SE_ERR_PNF: file = L"The specified path was not found."; break;
			case SE_ERR_SHARE: file = L"A sharing violation occurred."; break;
			default: file = L"Unknown error."; break;
		}
		if (!q) wprintf(L"Execute error: %s\n", file);
		return 2 + i;
	}
	return 0;
}


int main()
{
	int argc;
	wchar_t** argv = CommandLineToArgvW(GetCommandLine(), &argc);
	if (argv == NULL) return 1;
	mymain(argv, argc);
	LocalFree(argv);
	return 0;
}
