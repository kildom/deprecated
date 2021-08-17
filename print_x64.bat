@echo off

cd /d %~dp0

:dalej

IF [%1] EQU [] goto koniec

StartShellExecute_x64 /v print %1

shift

goto dalej

:koniec
