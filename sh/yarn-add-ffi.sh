# After re-compiling the local FFI dylib during development, it needs to be removed and added to use the new binary:

yarn remove smpi-iop-node-ffi;
yarn add --dev file:./../smpi-iop-node-ffi;
