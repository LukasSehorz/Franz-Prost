#!/bin/zsh
cd "$(dirname "$0")"
(sleep 1 && open "http://localhost:8080") &
node vorschau-server.js
