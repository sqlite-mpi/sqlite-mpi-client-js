import _ from "lodash";


const throwIfError = (rr) => {
    return {
        send: async (i) => {
            const o = await rr.send(i);

            const isValid = (_.isObject(o) && "ok" in o && _.isBoolean(o.ok));
            if (!isValid) {
                // This should never happen (server side should be strongly typed, well tested).
                throw Error("Invalid response message schema.");
            }

            if (!o.ok) {
                throw JSONErrToJS(o.error);
            }

            return o.res;
        }
    }

};

/**
 * Construct a descriptive error message.
 * - `Error` cannot be extended on older platforms; this error should work in most envs.
 * - Users should understand the underlying SQLite errors.
 * - Any logs should be extremely easy to understand and debug.
 *
 * @todo/low Auto rollback tx option?
 */
const JSONErrToJS = (e) => {
    const {
        error_type,
        message = null,
        data = {}
    } = e;

    const kv = [
        ["error_type", error_type],
    ];

    if ("return_status" in data) {
        const {
            return_status: {
                primary: {
                    id,
                    code
                },
                extended = null,
                err_msg = null
            }
        } = data;

        kv.push(["sqlite.code.primary", `${code}, ${id}`]);

        if (_.isPlainObject(extended)) {
            const {
                id,
                code
            } = extended;
            kv.push(["sqlite.code.extended", `${code}, ${id}`]);
        }

        if (_.isString(err_msg)) {
            kv.push(["err_msg", err_msg]);
        }
    }

    if (_.isString(message)) {
        kv.push(["message", message]);
    }

    const m = kv.map(([k, v]) => `${k}: ${v}`).join(",\n");

    const jsErr = Error(m);

    // @todo/low Extend Error, test on RN.
    // @ts-ignore (No property on Error)
    jsErr.data = e;

    return jsErr;
};


export {
    throwIfError
}
