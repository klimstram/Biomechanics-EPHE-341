"""Copy Master_questions.csv into questions.js, so the Tutor has its
questions even when index.html is opened straight from the folder (browsers
will not let a page opened that way read the CSV itself).

Run it after editing the CSV:  python3 update-questions.py
or double-click "Update questions.command".

On the published site the page reads the CSV directly and does not use this
copy, so a forgotten update only affects opening the page from the folder,
and the page says how old its copy is when it uses it.
"""
import codecs
import datetime
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'Master_questions.csv')
OUT = os.path.join(HERE, 'questions.js')


# The CSV is UTF-8 with a few single Mac Roman bytes (’ saved as 0xD5,
# – as 0xD0). Read those as the characters they were, as tutor.js does.
def mac_roman(err):
    return bytes(err.object[err.start:err.end]).decode('mac_roman'), err.end


codecs.register_error('macroman', mac_roman)

raw = open(SRC, 'rb').read()
text = raw.decode('utf-8', errors='macroman')
if text.startswith('﻿'):
    text = text[1:]
stamp = datetime.datetime.fromtimestamp(os.path.getmtime(SRC)).strftime('%Y-%m-%d %H:%M')
with open(OUT, 'w', encoding='utf-8') as f:
    f.write('/* A copy of Master_questions.csv (saved %s), made by update-questions.py.\n'
            '   Used only when the CSV itself cannot be read, e.g. index.html opened from the folder. */\n'
            % stamp)
    f.write('window.TUTOR_QUESTIONS = ')
    json.dump({'saved': stamp, 'bytes': len(raw), 'csv': text}, f, ensure_ascii=False)
    f.write(';\n')
print('questions.js updated from Master_questions.csv (saved %s, %d rows of text).'
      % (stamp, text.count('\n')))
