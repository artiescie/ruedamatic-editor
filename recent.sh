#!/usr/bin/env bash
#COMPARE most recent source timestamp to BUILD timestamp
COUNT=3
find ./src -type f -printf "%T@ %p\n" | sort -n | sed -r 's/^[0-9.]+\s+//' | tail -n $COUNT | xargs -I{} ls -l "{}"
echo EXE
find ./build/*.exe -type f -printf "%T@ %p\n" | sort -n | sed -r 's/^[0-9.]+\s+//' | tail -n 1 | xargs -I{} ls -l "{}"
