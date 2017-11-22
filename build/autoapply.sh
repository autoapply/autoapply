#!/bin/sh
export LOG_LEVEL="${AUTOAPPLY_LOG_LEVEL:-info}"
if [ -n "${AUTOAPPLY_CONFIG}" ]; then
    echo "${AUTOAPPLY_CONFIG}" > "${HOME}/autoapply.yaml"
fi
exec autoapply "${@}"
