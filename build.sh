#!/bin/bash

echo -n "window.__my__load('data:text/javascript;base64," > worker.b64.js
base64 -w 0 worker.js >> worker.b64.js
echo "');" >> worker.b64.js
