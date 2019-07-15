/*
	Copyright (C) 2008
		Dominik Kilian <dkilian@op.pl>

	This file is part of USBaspX.

	USBaspX is free software; you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation; either version 2 of the License, or
	(at your option) any later version.

	USBaspX is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.

	You should have received a copy of the GNU General Public License
	along with USBaspX; if not, write to the Free Software
	Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA

*/

#ifndef buffers_h
#define buffers_h

#include "usbdrv.h"

#define inBufSize 256

extern uchar inBuf[256];
extern uchar inBufPushPos;
extern uchar inBufPopPos;

#define inBufPush(c)  (inBuf[inBufPushPos++] = c)
#define inBufPushBlock(n) (inBufPushPos += n)
#define inBufPop()    (inBuf[inBufPopPos++])
#define inBufPopBlock(n) (inBufPopPos += n)
#define inBufReset()  (inBufPushPos = inBufPopPos = 0)
#define inBufLength() ((uchar)(inBufPushPos - inBufPopPos))
#define inBufLeft()   ((uchar)((inBufSize - 1) - (inBufPushPos - inBufPopPos)))

#define inBufTryUnlock() { if (usbAllRequestsAreDisabled() && inBufLeft() >= 16) usbEnableAllRequests(); }


#define outBufSize 256

extern uchar outBuf[256];
extern uchar outBufPushPos;
extern uchar outBufPopPos;

#define outBufPush(c)  (outBuf[outBufPushPos++] = c)
#define outBufPushBlock(n) (outBufPushPos += n)
#define outBufPop()    (outBuf[outBufPopPos++])
#define outBufPopBlock(n) (outBufPopPos += n)
#define outBufReset()  (outBufPushPos = outBufPopPos = 0)
#define outBufLength() ((uchar)(outBufPushPos - outBufPopPos))
#define outBufLeft()   ((uchar)((outBufSize - 1) - (outBufPushPos - outBufPopPos)))


#endif
