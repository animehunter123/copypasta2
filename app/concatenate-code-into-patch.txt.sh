#!/bin/bash

for i in `find . | egrep -v '.meteor\/|node.modules|./public' `; do echo @@@@@FILENAME: $i ; cat $i  ; done
