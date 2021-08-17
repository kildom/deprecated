@echo off

cd /d %~dp0

:dalej

IF [%1] EQU [] goto koniec

StartShellExecute /v print %1

shift

goto dalej

:koniec
