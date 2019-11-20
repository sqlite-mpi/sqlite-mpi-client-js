
# Note: `-t` allows filtering tests by name:
# `jest test/all/params.js -t "bound"`

# Issue: `jest` runtime has an issue running many tests at the same time that use the `ffi` NPM package.
# Fix: run separately.
jest test/all/basic;
jest test/all/extensions.js;
jest test/all/interleaving.js;
jest test/all/params.js;
