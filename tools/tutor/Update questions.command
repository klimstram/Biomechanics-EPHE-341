#!/bin/bash
# Double-click after editing Master_questions.csv, so that opening
# index.html from this folder shows the edited questions.
cd "$(dirname "$0")" || exit 1
python3 update-questions.py
echo
read -n 1 -s -r -p "Press any key to close this window."
