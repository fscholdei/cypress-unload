#!/usr/bin/env bash
# Runs the repro with one or more Cypress versions, each installed into its own directory under versions/.
# usage: ./test-version.sh <cypress-version>... [-- <browser>]
#   ./test-version.sh 14.5.4 15.0.0
#   ./test-version.sh 15.0.0 -- chrome
set -u

repo_dir="$(cd "$(dirname "$0")" && pwd)"
browser="electron"
versions=()
while [ $# -gt 0 ]; do
    case "$1" in
        --) browser="${2:-electron}"; shift 2 || shift ;;
        *) versions+=("$1"); shift ;;
    esac
done

if [ ${#versions[@]} -eq 0 ]; then
    echo "usage: $0 <cypress-version>... [-- <browser>]" >&2
    exit 1
fi

for version in "${versions[@]}"; do
    dir="${repo_dir}/versions/${version}"
    mkdir -p "${dir}"
    cp -r "${repo_dir}/server.js" "${repo_dir}/cypress.config.js" "${repo_dir}/cypress" "${dir}/"
    cd "${dir}"

    if [ ! -x node_modules/.bin/cypress ]; then
        echo '{"private": true}' > package.json
        if ! npm install --no-audit --no-fund "cypress@${version}" > install.log 2>&1; then
            echo "${version} ${browser}: install failed, see ${dir}/install.log"
            continue
        fi
    fi

    npx cypress run --browser "${browser}" > "run-${browser}.log" 2>&1
    summary="$(sed 's/\x1b\[[0-9;]*m//g' "run-${browser}.log" | grep -a -o -E '[0-9]+ (passing|failing)' | tr '\n' ' ')"
    echo "${version} ${browser}: ${summary:-no result, see ${dir}/run-${browser}.log}"
done
