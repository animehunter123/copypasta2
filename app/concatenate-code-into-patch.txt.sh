#!/bin/bash

for i in $(find . -type f | egrep -v '.meteor\/|node.modules|./public'); do
  echo @@@@@FILENAME: $i
  cat $i
done
