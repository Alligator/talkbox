#!/bin/sh
supervisorctl restart talkbox
supervisorctl tail -f talkbox
