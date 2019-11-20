import uuidv4 from "uuid/v4";

const newPromise = () => {
    let resolve = null;
    let reject = null;

    const promise = new Promise((ok, err) => {
        resolve = ok;
        reject = err;
    });

    return Object.freeze({
        promise,
        resolve,
        reject
    });
};


/**
 * This function:
 * - Takes an IOP as input (IOP = IO Provider).
 * - Converts the IO functions to a request response interface so it can be used: `const res = await rr.send(req)`;
 *
 * Assumptions:
 * - The host can provide a (i: RR, o: ST) interface.
 *      - Input can be request/response.
 */
const toReqRes = (iop) => {
    const pending = {};

    const outFn = (ret_o_str) => {
        let ret_o = null;

        try {
            ret_o = JSON.parse(ret_o_str);
        } catch (e) {
            console.error("`ret_o` string returned from FFI output fn is not valid JSON.");
            throw e;
        }

        const {
            ret_o_type,
            val: {
                in_msg_id = null,
                msg = null
            }
        } = ret_o;

        if (ret_o_type !== "settled") {
            // E.g. for log events (that do not use request/response).
            console.log("Unsupported `ret_o_type` from FFI output fn.");
            return;
        }

        if (!pending.hasOwnProperty(in_msg_id)) {
            console.log(in_msg_id, ret_o.val);
            throw Error("msgId not found in pending list.");
        }

        pending[in_msg_id].resolve(JSON.parse(msg));
        delete pending[in_msg_id];
    };

    const io = iop.init(outFn);


    const send = async (msg) => {
        // Note: `msg.id` = Promise ID.
        msg.id = uuidv4();
        const p = newPromise();

        // Allow `outFn` to resolve this promise with a value.
        pending[msg.id] = p;

        const ret_i_str = await io.input(JSON.stringify(msg));
        // Note: At this point `outFn` may have already run and resolved `p`. (E.g in RN, message order is not defined).

        let ret_i = null;
        try {
            ret_i = JSON.parse(ret_i_str);
        } catch (e) {
            console.error("`ret_i` string returned from FFI input fn is not valid JSON.");
            throw e;
        }

        const {
            ret_i_type,
        } = ret_i;

        // settled = (fulfilled | rejected)
        // pending = !settled (return value will be an output event).
        if (ret_i_type === "settled") {
            delete pending[msg.id];
            // When: JSON parse error.
            return Promise.resolve(ret_i.val.msg);
        }

        // Wait for `outFn` to resolve this promise.
        if (ret_i_type === "pending") {
            return p.promise;
        }

        throw Error("Invalid ret type.");
    };

    return {
        send,
        // onEvent? Allow callback on incoming events (with no initial request).
    }
};


export {
    toReqRes
}
