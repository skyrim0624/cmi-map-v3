#!/bin/bash

OUTPUT_DIR="${TMPDIR:-/tmp}/cmi-map-vite-lint-build-$$"
trap 'rm -rf "$OUTPUT_DIR"' EXIT

OUTPUT=$(npx vite build --minify false --logLevel error --outDir "$OUTPUT_DIR" 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
    echo "$OUTPUT"
fi

exit $EXIT_CODE
