const nodeUtil = require('util');

// @todo/medium `jest` CLI can only run one test file at a time, as the FFI module conflicts with the `jest` runtime.
const iop = require("smpi-iop-node-ffi");

const {
    smpi
} = require("./../dist/index");

// const epReqRes = util.toReqRes(io);

const getNewTestFile = () => {
    const d = (new Date()).toISOString();
    const randomId = Math.ceil(Math.random() * 100000000).toString(16);
    return `/tmp/smpi-js-test-${d}-${randomId}.sqlite`;
};

const c = smpi.newClient(iop);
const getNewFileRef = () => {
    return c.newFileRef(getNewTestFile());
};


/**
 * Note: Only works in node.
 * @see https://stackoverflow.com/questions/30564053/how-can-i-synchronously-determine-a-javascript-promises-state
 * - There is no API to determine a pending promise in sync code.
 */
const isPending = (p) => {
    return nodeUtil.inspect(p).indexOf("pending") > -1;
};

const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

module.exports = {
    getNewTestFile,
    getNewFileRef,
    isPending,
    sleep
};
