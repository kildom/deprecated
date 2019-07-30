/*
*	Copyright (c) 2011-2012, Dominik Kilian <kontakt@dominik.cc>
*	All rights reserved.
*	See license.txt for details.
*/

#ifndef _config_h_
#define _config_h_

// Odczytuje konfiguracje, wyœwietla konsolê z bêdami, je¿eli takie wyst¹pi¹
void readConfig();

// Wybiera podane okno jako aktywne, zwraca false, je¿eli okno nie jest znane
bool selectWindow(HWND win1);

// Sprawdza, czy któryœ gest zaczyna siê podanym ci¹giem
bool checkGest(char* gest, int gestLen);

// Wykonuje podany gest, zwraca false, je¿eli nie ma tekigo gestu
bool execGest(char* gest, int gestLen);

// Zwraca nazwê gestu lub NULL, je¿eli takiego nie ma
wchar_t* getGestName(char* gest, int gestLen);

bool getGestShow(char* gest, int gestLen);

#endif
