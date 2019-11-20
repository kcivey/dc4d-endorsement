#!/usr/bin/env bash

set -e
echo 'Copying files to dist'
cp -u index.html dist/
echo 'Compiling and minifying JS'
npx babel index.js | \
    npx browserify - | \
    npx terser -c -m --toplevel --comments /Copyright/ \
    > dist/index.js
