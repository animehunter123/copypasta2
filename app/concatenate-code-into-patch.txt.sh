#!/bin/bash

cd app 2>/dev/null
for i in $(find . -type f | egrep -v '.meteor\/|node.modules|./public|./data'); do
  echo @@@@@FILENAME: $i
  cat $i
done