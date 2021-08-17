/*     penPROTECT
Copyright (C) 2009-2010 Dominik Kilian

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 2
of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program; if not, write to the Free Software
Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.

*/

// Windows XP minimum
#define _WIN32_WINNT 0x0501 

#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <conio.h>
#include <ctype.h>
#include <windows.h>

#include "resource.h"
#include "config.h"

char volumeName[MAX_PATH+1];
char volumePath[MAX_PATH+1];
int volumeClusterSize;
bool volumeFat;

#ifdef VISUAL
#pragma pack(push)
#pragma pack(1)
#endif
typedef struct {
	U8 jmpBoot[3];
	U8 OEMName[8];	
	U16 BytsPerSec;	
	U8 SecPerClus;
	union {
		U16 RsvdSecCnt;
		U16 ResvdSecCnt;
	};
	U8 NumFATs;		
	U16 RootEntCnt;	
	U16 TotSec16;
	U8 Media;
	U16 FATSz16;	
	U16 SecPerTrk;	
	U16 NumHeads;
	U32 HiddSec;	
	U32 TotSec32;
	union {
		struct {
			U8 DrvNum;
			U8 Reserved1;
			U8 BootSig;
			U32 VolID;
			U8 VolLab[11];
			U8 FilSysType[8];
			U8 Reserved5[448];
		} packed Fat16;
		struct {
			U32 FATSz32;
			U16 ExtFlags;
			U16 FSVer;
			U32 RootClus;
			U16 FSInfo;
			U16 BkBootSec;
			U8 Reserved2[12];
			U8 DrvNum;
			U8 Reserved3;
			U8 BootSig;
			U32 VolID;
			U8 VolLab[11];
			U8 FilSysType[8];
			U8 Reserved4[420];
		} packed Fat32;
	};
	U16 Sig;
	char ReservedE[7680];
} packed BootSector;
#ifdef VISUAL
#pragma pack(pop)
#endif

#ifdef VISUAL
#pragma pack(push)
#pragma pack(1)
#endif
typedef struct {
	char Name[11];
	U8 Attr;
	U8 NTRes;
	U8 CrtTimeTenth;
	U16 CrtTime;
	U16 CrtDate;
	U16 LstAccDate;
	U16 FstClusHI;
	U16 WrtTime;
	U16 WrtDate;
	U16 FstClusLO;
	U32 FileSize;
} packed DirEntry;
#ifdef VISUAL
#pragma pack(pop)
#endif

class Exception {};

class Fat
{

public:

	HANDLE disk;

	// DiskData
	DWORD sectorSize;
	DWORD sectorBits;

	// FS Type
	bool isFat16;
	bool inRoot;

	// FS Info
	DWORD firstSector;
	DWORD rootSector;
	DWORD rootCluster;
	DWORD rootSize;
	DWORD fat1Sector;
	DWORD fat2Sector;
	DWORD clustersCount;
	DWORD clusterSize;

	// Current state
	DWORD currentSector;
	DWORD currentCluster;
	DWORD currentClusterSize;
	char* data;
	DWORD pos;

	void readData(DWORD sector, DWORD count, char* buffer = 0)
	{
		if (!buffer) buffer = data;

		LARGE_INTEGER li;
		li.LowPart = (DWORD)(sector << sectorBits);
		li.HighPart = (DWORD)(sector >> (32-sectorBits));

		if (!SetFilePointerEx(disk, li, NULL, SEEK_SET))
			throw Exception();

		DWORD br = 0;
		if (!ReadFile(disk, buffer, sectorSize*count, &br, NULL))
			throw Exception();

		if (br != sectorSize*count)
			throw Exception();
	}

	
	void writeData(DWORD sector, DWORD count, char* buffer = 0)
	{
		if (!buffer) buffer = data;

		LARGE_INTEGER li;
		li.LowPart = (DWORD)(sector << sectorBits);
		li.HighPart = (DWORD)(sector >> (32-sectorBits));

		if (!SetFilePointerEx(disk, li, NULL, SEEK_SET))
			throw Exception();

		DWORD bw = 0;
		if (!WriteFile(disk, buffer, sectorSize*count, &bw, NULL))
			throw Exception();

		if (bw != sectorSize*count)
			throw Exception();
	}

	
	DWORD getFat(DWORD cluster)
	{
		unsigned long buf32[2048];
		unsigned short *buf16 = (unsigned short*)buf32;

		if (cluster < 2 || cluster >= clustersCount) return 0x0FFFFFF7;

		DWORD sec = isFat16 ? (cluster / (sectorSize/2)) : (cluster / (sectorSize/4));
		DWORD pos = isFat16 ? (cluster & (sectorSize/2-1)) : (cluster & (sectorSize/4-1));

		readData(fat1Sector+sec, 1, (char*)buf32);
		if (isFat16) {
			DWORD ret = buf16[pos];
			if (ret >= 0xFFF7) ret = 0x0FFF0000 | ret;
			return ret;
		} else {
			return buf32[pos] & 0x0FFFFFFF;
		}
	}

	
	bool setFat(DWORD cluster, DWORD value)
	{
		unsigned long buf32[2048];
		unsigned short *buf16 = (unsigned short*)buf32;

		if (cluster < 2 || cluster >= clustersCount) return false;

		DWORD sec = isFat16 ? (cluster / (sectorSize/2)) : (cluster / (sectorSize/4));
		DWORD pos = isFat16 ? (cluster & (sectorSize/2-1)) : (cluster & (sectorSize/4-1));

		readData(fat1Sector+sec, 1, (char*)buf32);
		if (isFat16) {
			buf16[pos] = (unsigned short)value;
		} else {
			buf32[pos] = (buf32[pos] & 0xF0000000) | (value & 0x0FFFFFFF);
		}
		writeData(fat1Sector+sec, 1, (char*)buf32);

		if (fat2Sector) {
			readData(fat2Sector+sec, 1, (char*)buf32);
			if (isFat16) {
				buf16[pos] = (unsigned short)value;
			} else {
				buf32[pos] = (buf32[pos] & 0xF0000000) | (value & 0x0FFFFFFF);
			}
			writeData(fat2Sector+sec, 1, (char*)buf32);
		}

		return true;

	}

	
	bool isBad(DWORD val) { return val == 0x0FFFFFF7; }
	bool isEmpty(DWORD val) { return val == 0; }
	bool isEoc(DWORD val) { return val >= 0x0FFFFFF8; }
	bool isValid(DWORD val) { return val > 1 && val < 0x0FFFFFF7; }
	DWORD sectorFromCluster(DWORD cluster) { return firstSector + cluster * clusterSize; } 

	static const DWORD valueBad = 0x0FFFFFF7;
	static const DWORD valueEmpty = 0;
	static const DWORD valueEoc = 0x0FFFFFFF;

	void initFat()
	{
		BootSector boot;
		char buf[8192];

		readData(0, 1, (char*)&boot);

		if (((char*)&(boot.Sig) - (char*)&boot) != 510) {
			printf("PACK ERROR %d\r\n", (int)((char*)&(boot.Sig) - (char*)&boot));
			throw Exception();
		}

		memcpy(buf, (void*)&boot, sizeof(buf));

		if (boot.Sig != 0xAA55) throw Exception();
		if (boot.BytsPerSec != sectorSize) throw Exception();
		if (boot.SecPerClus > 128) throw Exception();
		if (boot.NumFATs > 2 || boot.NumFATs < 1)throw Exception();

		clusterSize = boot.SecPerClus;

		U32 TotSec = 0;
		if (boot.TotSec16 != 0) {
			TotSec = boot.TotSec16;
		} else {
			TotSec = boot.TotSec32;
		}

		if (TotSec < 64) throw Exception();

		rootSize = ((boot.RootEntCnt * 32) + (sectorSize-1)) / sectorSize;

		U32 FATSz;
		if (boot.FATSz16 != 0) {
			FATSz = boot.FATSz16;
		} else {
			FATSz = boot.Fat32.FATSz32;
		}

		U32 FirstDataSector = boot.ResvdSecCnt + (boot.NumFATs * FATSz) + rootSize;

		firstSector = FirstDataSector - 2 * boot.SecPerClus;

		U32 DataSec = TotSec - (boot.ResvdSecCnt + (boot.NumFATs * FATSz) + rootSize);

		clustersCount = DataSec / boot.SecPerClus;

		if (clustersCount < 4085) {
			throw Exception();
		} else if (clustersCount < 65525) {
			isFat16 = true;
		} else {
			isFat16 = false;
		}

		fat1Sector = boot.ResvdSecCnt;
		if (boot.NumFATs > 1) {
			fat2Sector = boot.ResvdSecCnt + FATSz;
		} else {
			fat2Sector = 0;
		}

		if (isFat16) {
			if (boot.Fat16.BootSig != 0x29) throw Exception();
			rootCluster = 0;
			rootSector = boot.ResvdSecCnt + (boot.NumFATs * FATSz);
		} else {
			if (boot.Fat32.BootSig != 0x29) throw Exception();
			if (boot.Fat32.FSVer != 0) throw Exception();
			rootCluster = boot.Fat32.RootClus;
			rootSector = firstSector + clusterSize*rootCluster;
			if (rootCluster >= clustersCount) throw Exception();
		}
		
		data = new char[sectorSize*clusterSize];

	}

	
	Fat(char* volume)
	{
		char name[]="\\\\.\\X:";
		char rname[]="X:\\";
		data = 0;
		name[4] = volume[0];
		rname[0] = volume[0];
		disk = CreateFile(name, GENERIC_WRITE | GENERIC_READ, FILE_SHARE_READ | FILE_SHARE_WRITE, NULL, OPEN_EXISTING, 0, 0);
		if (disk == INVALID_HANDLE_VALUE)
			throw Exception();
		DWORD spc, bps, fc, tc;
		if (!GetDiskFreeSpace(rname, &spc, &bps, &fc, &tc))
			throw Exception();
		sectorSize = bps;
		sectorBits = 0;
		while (bps & (~1)) {
			sectorBits++;
			bps >>= 1;
		}
		if (bps != 1 || sectorSize > 8192)
			throw Exception();
		initFat();
	}

	
	~Fat()
	{
		close();
		if (data) delete[] data;
	}

	void close()
	{
		if (disk != INVALID_HANDLE_VALUE) {
			FlushFileBuffers(disk);
			CloseHandle(disk);
		}
		disk = INVALID_HANDLE_VALUE;
	}

	
	void goToRoot()
	{
		currentSector = rootSector;
		currentCluster = rootCluster;
		if (isFat16) {
			currentClusterSize = 1;
		} else {
			currentClusterSize = clusterSize;
		}
		pos = 0;
		readData(currentSector, currentClusterSize);
		inRoot = true;
	}

	bool goToNext()
	{
		if (inRoot && isFat16) {

			if (currentSector - rootSector >= rootSize-1) return false;
			currentSector++;

		} else {

			DWORD next = getFat(currentCluster);
			if (!isValid(next)) return false;

			currentCluster = next;
			currentSector = sectorFromCluster(next);

		}

		pos = 0;
		readData(currentSector, currentClusterSize);

		return true;

	}

	bool goToCluster(DWORD cluster)
	{
		DWORD next = getFat(cluster);
		if (!isValid(next) && !isEoc(next)) return false;
		inRoot = false;
		currentCluster = cluster;
		currentSector = sectorFromCluster(cluster);
		currentClusterSize = clusterSize;
		pos = 0;
		readData(currentSector, currentClusterSize);
		return true;
	}

	DirEntry* entry()
	{
		DirEntry* dir = (DirEntry*)data;
		return &dir[pos/32];
	}

	bool goToEntry(char* path)
	{
		goToRoot();
		do {

			do {
				if (strncmp(path, entry()->Name, 11)==0) {
					break;
				}
				pos += 32;
				if (pos >= currentClusterSize*sectorSize) {
					if (!goToNext()) return false;
				}
			} while (true);

			while (*path && *path!='\\') path++;

			if (*path == '\\') {
				int p = pos/32;
				path++;
				if (!(entry()->Attr & 0x10)) return false;
				if (!goToCluster(((DWORD)(entry()->FstClusHI)<<16) | (DWORD)(entry()->FstClusLO))) return false;
			} else {
				return true;
			}
		} while (true);
	}

	bool saveCluster()
	{
		writeData(currentSector, currentClusterSize);
		return true;
	}

};


int message(int str, int menu = 0, char* cstr = 0, char* cmenu = 0)
{
	int n = -1;
	char line[8*1024];
	line[0] = 0;
	if (!cstr) {
		if (str)
			LoadString(0, str, line, sizeof(line));
	} else {
		strcpy(line, cstr);
	}
	fwrite(line, 1, strlen(line), stdout);
	line[0] = 0;
	if (!cmenu) {
		if (menu)
			LoadString(0, menu, line, sizeof(line));
	} else {
		strcpy(line, cmenu);
	}
	do
	{
		char c = _getch();
		for (n=0; n < (int)strlen(line); n++) {
			if (toupper(c) == toupper(line[n])) {
				break;
			}
		}
	} while (n >= (int)strlen(line) && line[0]);
	return n;
}

void showResource(int id)
{
	char buf[8*1024];
	LoadString(0, id, buf, sizeof(buf));
	fwrite(buf, 1, strlen(buf), stdout);
}

struct VolInfo
{
	bool fat;
	char line[256];
	char name[MAX_PATH];
	char path[MAX_PATH];
	int clusterSize;
};

VolInfo volInfos[100];
int volInfosCount;

int volInfosCmp(const void *pa, const void *pb)
{
	return strcmp(((VolInfo*)pa)->line, ((VolInfo*)pb)->line);
}

void getVolume() 
{
	char name[MAX_PATH+1];
	char path[4];
	char type[10];
	char label[MAX_PATH+1];
	char fs[MAX_PATH+1];
	char list[8*1024];
	char menu[256];
	int total;
	int free;
	int clusterSize;

	int finded;
	DWORD l;
	int sel;

	do {

		finded = 1;
		menu[0] = 0;
		volumeName[0] = 0;
		volumePath[0] = 0;
		volInfosCount = 0;

		HANDLE vf = FindFirstVolume(name, sizeof(name));

		if (vf == INVALID_HANDLE_VALUE) return;

		while (finded) {

			bool is_a = false;

			GetVolumePathNamesForVolumeName(name, list, sizeof(list), &l);

			path[0] = 0;
			char *p = list;
			while (*p) {
				if (p[1] == ':' && p[2] == '\\' && p[3] == 0) strcpy(path, p);
				if (strcmp(p, "A:\\") == 0 || strcmp(p, "B:\\") == 0) is_a = true;
				while (*p) p++;
				p++;
			}
			if (!path[0]) continue;

			switch (GetDriveType(name))
			{
			case DRIVE_REMOVABLE: LoadString(0, IDS_DRIVE_REMOVABLE, type, sizeof(type)); break;
			case DRIVE_FIXED: LoadString(0, IDS_DRIVE_FIXED, type, sizeof(type)); break;
			case DRIVE_REMOTE: LoadString(0, IDS_DRIVE_REMOTE, type, sizeof(type)); break;
			case DRIVE_CDROM: LoadString(0, IDS_DRIVE_CDROM, type, sizeof(type)); break;
			case DRIVE_RAMDISK: LoadString(0, IDS_DRIVE_RAMDISK, type, sizeof(type)); break;
			default: LoadString(0, IDS_DRIVE_UNKNOWN, type, sizeof(type)); break;
			}

			if (is_a || !GetVolumeInformation(name, label, sizeof(list), NULL, NULL, NULL, fs, sizeof(fs))) {
				strcpy(label, "");
				strcpy(fs, "");
			}

			if (strcmp(label, path) == 0) strcpy(label, "");

			DWORD spc, bps, fc, tc;
			if (!is_a && GetDiskFreeSpace(name, &spc, &bps, &fc, &tc)) {
				DWORD bpc = spc*bps;
				clusterSize = bpc;
				while (bpc >= 512 && bpc < 1024*1024) {
					bpc *= 2;
					tc >>= 1;
					fc >>= 1;
				}
				total = tc;
				free = fc;
			} else {
				total = 0;
				free = 0;
			}

			if (strcmp(fs, "") != 0) {
				strcpy(volInfos[volInfosCount].name, name);
				strcpy(volInfos[volInfosCount].path, path);
				sprintf(volInfos[volInfosCount].line, "  %c   %9s %9dMB %9dMB  %5s  %s", path[0], type, total, free, fs, label);
				volInfos[volInfosCount].clusterSize = clusterSize;
				volInfos[volInfosCount].fat = strcmp(fs, "FAT")==0 || strcmp(fs, "FAT32")==0 || strcmp(fs, "FAT16")==0;
				volInfosCount++;
				if (volInfosCount >= 100) break;
			}

			finded = FindNextVolume(vf, name, sizeof(name));

		}
		FindVolumeClose(vf);

		qsort(volInfos, volInfosCount, sizeof(volInfos[0]), volInfosCmp);

		showResource(IDS_DISKS);

		if (volInfosCount) {
			int i;
			for (i=0; i<volInfosCount; i++) {
				puts(volInfos[i].line);
				menu[i] = volInfos[i].path[0];
			}
			menu[i] = 0;
		} else {
			showResource(IDS_DISKSNONE);
		}

		showResource(IDS_DISKS2);

		strcat(menu, "\x1B\r");

		sel = message(0, 0, 0, menu);

		if (sel == volInfosCount) return;

	} while (sel > volInfosCount);

	strcpy(volumeName, volInfos[sel].name);
	strcpy(volumePath, volInfos[sel].path);
	volumeClusterSize = volInfos[sel].clusterSize;
	volumeFat = volInfos[sel].fat;

}

bool newFile(char* path, char* text = 0)
{
	HANDLE h = CreateFile(path, GENERIC_WRITE, 0, NULL, CREATE_NEW, FILE_ATTRIBUTE_NORMAL, NULL);
	if (h != INVALID_HANDLE_VALUE) {
		if (text && strlen(text)) {
			DWORD wr;
			WriteFile(h, text, strlen(text), &wr, NULL);
			CloseHandle(h);
			return wr == strlen(text);
		};
		CloseHandle(h);
		return true;
	} else {
		return false;
	}
}

bool DeleteDir(char* path)
{
	char* p = path;
	while (*(p++));
	*p = 0;
	SHFILEOPSTRUCT o;
	o.hwnd = HWND_DESKTOP;
	o.wFunc = FO_DELETE;
	o.pFrom = path;
	o.pTo = NULL;
	o.fFlags = FOF_NOCONFIRMATION | FOF_SILENT | FOF_NOERRORUI;
	o.lpszProgressTitle = "Delete";
	return SHFileOperation(&o) == 0;
}

void createAutorun(char* name)
{
	char path[MAX_PATH+1];
	char file[8*MAX_PATH];
	strcpy(path, volumePath);
	strcat(path, name);

	// Odkryj plik
	SetFileAttributes(path, FILE_ATTRIBUTE_ARCHIVE);

	DWORD attr = GetFileAttributes(path);
	if (attr != INVALID_FILE_ATTRIBUTES) {
		// Je¿eli to plik to usun go i utworz katalog
		if (!(attr & FILE_ATTRIBUTE_DIRECTORY)) {
			DeleteFile(path);
			if (!CreateDirectory(path, NULL)) 
				throw Exception();
		}
	} else {
		if (!CreateDirectory(path, NULL))
			throw Exception();
	}

	// Stan: istnieje odkryty niekoniecznie pusty katalog

	int num = 0;
	bool create;


	// =================== VOLLOCK

	strcpy(file, path);
	strcat(file, "\\VOLLOCK");

	// Je¿eli nie istnieje, utwórz
	attr = GetFileAttributes(file);
	if (attr == INVALID_FILE_ATTRIBUTES)
		newFile(file);

	SetFileAttributes(file, FILE_ATTRIBUTE_HIDDEN|FILE_ATTRIBUTE_READONLY|FILE_ATTRIBUTE_SYSTEM);

	// SprawdŸ poprawnoœæ
	attr = GetFileAttributes(file);
	if (attr != INVALID_FILE_ATTRIBUTES)
		num++;


	// =================== FTDLOCK

	strcpy(file, path);
	strcat(file, "\\FTDLOCK");

	// Spróbuj usun¹æ
	attr = GetFileAttributes(file);
	if (attr != INVALID_FILE_ATTRIBUTES) {
		if (attr & FILE_ATTRIBUTE_DIRECTORY) {
			if (DeleteDir(file)) {
				create = true;
			} else {
				create = false;
			}
		} else {
			SetFileAttributes(file, FILE_ATTRIBUTE_ARCHIVE);
			DeleteFile(file);
			create = true;
		}
	} else {
		create = true;
	}

	// Je¿eli trzeba tworzyæ
	if (create) {
		if (newFile(file, "cos")) num++;
	} else {
		num++;
	}

	SetFileAttributes(file, FILE_ATTRIBUTE_HIDDEN|FILE_ATTRIBUTE_READONLY|FILE_ATTRIBUTE_SYSTEM);

	//===================== FCDLOCK

	strcpy(file, path);
	strcat(file, "\\FCDLOCK");

	// Je¿eli nie istnieje, utwórz
	attr = GetFileAttributes(file);
	if (attr == INVALID_FILE_ATTRIBUTES)
		newFile(file);

	SetFileAttributes(file, FILE_ATTRIBUTE_HIDDEN|FILE_ATTRIBUTE_READONLY|FILE_ATTRIBUTE_SYSTEM);

	// SprawdŸ poprawnoœæ
	attr = GetFileAttributes(file);
	if (attr != INVALID_FILE_ATTRIBUTES)
		num++;

	//===================== FCFLOCK

	strcpy(file, path);
	strcat(file, "\\FCFLOCK");

	// Je¿eli nie istnieje, utwórz
	attr = GetFileAttributes(file);
	if (attr == INVALID_FILE_ATTRIBUTES)
		newFile(file);

	SetFileAttributes(file, FILE_ATTRIBUTE_HIDDEN|FILE_ATTRIBUTE_READONLY|FILE_ATTRIBUTE_SYSTEM);

	// SprawdŸ poprawnoœæ
	attr = GetFileAttributes(file);
	if (attr != INVALID_FILE_ATTRIBUTES)
		num++;

	
	//===================== BCLOCK

	strcpy(file, path);
	strcat(file, "\\BCLOCK");

	// Spróbuj usun¹æ
	attr = GetFileAttributes(file);
	if (attr != INVALID_FILE_ATTRIBUTES) {
		if (attr & FILE_ATTRIBUTE_DIRECTORY) {
			if (DeleteDir(file)) {
				create = true;
			} else {
				create = false;
			}
		} else {
			SetFileAttributes(file, FILE_ATTRIBUTE_ARCHIVE);
			DeleteFile(file);
			create = true;
		}
	} else {
		create = true;
	}

	if (create) {
		if (CreateDirectory(file, NULL)) {
			int ile = (volumeClusterSize * 3) / 64;
			for (int i=0; i<ile; i++) {
				char fn[8*MAX_PATH];
				sprintf(fn, "%s\\%d", file, i);
				newFile(fn);
			}
			num++;
		}
	} else {
		num++;
	}

	SetFileAttributes(file, FILE_ATTRIBUTE_HIDDEN|FILE_ATTRIBUTE_READONLY|FILE_ATTRIBUTE_SYSTEM);

	//====================

	if (!num)
		throw Exception();

	SetFileAttributes(path, FILE_ATTRIBUTE_HIDDEN|FILE_ATTRIBUTE_READONLY|FILE_ATTRIBUTE_SYSTEM);

}


void createRecycler(char* name)
{
	char path[MAX_PATH+2];
	strcpy(path, volumePath);
	strcat(path, name);

	// Odkryj plik
	SetFileAttributes(path, FILE_ATTRIBUTE_ARCHIVE);

	DWORD attr = GetFileAttributes(path);
	if (attr != INVALID_FILE_ATTRIBUTES) {
		// Je¿eli to plik to usun go
		if (!(attr & FILE_ATTRIBUTE_DIRECTORY)) {
			DeleteFile(path);
		} else {
			DeleteDir(path);
		}
	}

	// Stan: nie ma wpisu RECYCLER na dysku

	// Utwórz plik
	if (!newFile(path)) 
		throw Exception();

	// Ukryj i zablokuj plik
	SetFileAttributes(path, FILE_ATTRIBUTE_HIDDEN|FILE_ATTRIBUTE_READONLY|FILE_ATTRIBUTE_SYSTEM);

}

void pass1()
{

	message(IDS_PASS1START);

	showResource(IDS_WAIT);

	try {
	
		//throw Exception();

		createAutorun("AUTORUN.INI");
		createAutorun("AUTORUN.INF");

		try {
			createRecycler("RECYCLER");
		} catch (Exception&) {};

		try {
			createRecycler("RECYCLED");
		} catch (Exception&) {};

		try {
			createRecycler("$RECYCLE.BIN");
		} catch (Exception&) {};

	} catch (Exception&) {

		message(IDS_PASS1ERROR);

		exit(1);

	}

}

void lockDir(Fat& fat, char* name)
{
	char path[1024];

	int num = 0;

	strcpy(path, name);
	strcat(path, "\\VOLLOCK    ");
	if (fat.goToEntry(path)) {
		fat.entry()->Attr = 0x2F;
		fat.saveCluster();
		num++;
	}

	strcpy(path, name);
	strcat(path, "\\FTDLOCK    ");
	if (fat.goToEntry(path)) {
		fat.entry()->Attr = 0x37;
		fat.saveCluster();
		num++;
	}

	strcpy(path, name);
	strcat(path, "\\FCDLOCK    ");
	if (fat.goToEntry(path)) {
		fat.entry()->Attr = 0x37;
		fat.entry()->FstClusLO = 1;
		fat.entry()->FstClusHI = 0;
		fat.saveCluster();
		num++;
	}

	strcpy(path, name);
	strcat(path, "\\FCFLOCK    ");
	if (fat.goToEntry(path)) {
		fat.entry()->Attr = 0x27;
		fat.entry()->FstClusLO = 1;
		fat.entry()->FstClusHI = 0;
		fat.saveCluster();
		num++;
	}

	strcpy(path, name);
	strcat(path, "\\BCLOCK     ");
	if (fat.goToEntry(path)) {
		fat.entry()->Attr = 0x37;
		fat.saveCluster();
		DWORD c1 = ((DWORD)(fat.entry()->FstClusHI)<<16) | (DWORD)(fat.entry()->FstClusLO);
		if (fat.isValid(c1)) {
			DWORD c2 = fat.getFat(c1);
			if (fat.isValid(c2)) {
				DWORD c3 = fat.getFat(c2);
				if (!fat.isBad(c3)) {
					fat.setFat(c2, fat.valueBad);
				}
				num++;
			}
		}
	}

	if (num < 1) 
		throw Exception();

}

void lockRecyc(Fat& fat, char* name)
{
	if (fat.goToEntry(name)) {
		fat.entry()->Attr = 0x27;
		fat.entry()->FstClusLO = 1;
		fat.entry()->FstClusHI = 0;
		fat.saveCluster();
	}
}

void pass2()
{

	if (volumeFat) {
		int r = message(IDS_PASS2START, 0, 0, "\r\x1B");
		if (r == 1) exit(0);
	} else {
		message(IDS_PASS2INVALID);
		exit(0);
	}

	showResource(IDS_WAIT);

	try {

		Fat fat(volumePath);
		
		lockDir(fat, "AUTORUN INF");
		lockDir(fat, "AUTORUN INI");

		lockRecyc(fat, "RECYCLED   ");
		lockRecyc(fat, "RECYCLER   ");
		lockRecyc(fat, "$RECYCLEBIN");

		fat.close();

		message(IDS_DONE);

	} catch (Exception&) {

		message(IDS_PASS2ERROR);

		exit(1);

	}

}

int main()
{

	switch (message(IDS_WITAJ, IDM_WITAJ))
	{
	case 0:
		switch (message(IDS_INFO, IDM_INFO))
		{
		case 0:
			break;
		case 1:
			if (message(IDS_LIC, IDM_LIC) == 1) return 0;
			break;
		case 2:
			return 0;
		}
		break;
	case 2:
		return 0;
	}

	getVolume();

	if (!volumeName[0]) return 0;

	pass1();

	pass2();

	return 0;

}

