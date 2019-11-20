import _ from "lodash";

/**
 * @returns string `q` without params, `q_params` with.
 */
const getFn = (base, p) => {
    if (hasParams(p)) {
        return `${base}_params`
    }
    return base;
};

const hasParams = (p) => {
    return _.isObject(p) || _.isArray(p)
};

const getParamKey = (p) => {
    if (_.isPlainObject(p)) {
        return "key_based";
    }
    if (_.isArray(p)) {
        return "index_based";
    }

    // This function should only be called when `params` is valid.
    throw Error("Invalid params");
};

const getRSet = async (rr, tx_id, base, q, p) => {
    if (p !== null && !hasParams(p)) {
        throw Error("Invalid type provided for params.");
    }

    const fn = `tx/${getFn(base, p)}`;

    const args = {
        tx_id,
        q
    };

    if (hasParams(p)) {
        args[getParamKey(p)] = p;
    }

    const rset = await rr.send({
        fn,
        args
    });

    return new RSet(rset);
};

class ReadTx {
    rr = null;
    txId = null;

    constructor(rr, txId) {
        this.rr = rr;
        this.txId = txId;
    }


    async q(q, p = null) {
        const {rr, txId: tx_id} = this;
        return getRSet(rr, tx_id, "q", q, p);
    }

    async read(q, p = null) {
        const {rr, txId: tx_id} = this;
        return getRSet(rr, tx_id, "read", q, p);
    }

    async commit() {
        const {rr, txId: tx_id} = this;

        const rset = await rr.send({
            fn: "tx/commit",
            args: {
                tx_id
            }
        });

        return new RSet(rset);
    }

    async rollback() {
        const {rr, txId: tx_id} = this;

        const rset = await rr.send({
            fn: "tx/rollback",
            args: {
                tx_id
            }
        });

        return new RSet(rset);
    }
}


class WriteTx {
    rr = null;
    txId = null;

    constructor(rr, txId) {
        this.rr = rr;
        this.txId = txId;
    }

    async q(q, p = null) {
        const {rr, txId: tx_id} = this;
        return getRSet(rr, tx_id, "q", q, p);
    }

    async read(q, p = null) {
        const {rr, txId: tx_id} = this;
        return getRSet(rr, tx_id, "read", q, p);
    }

    async write(q, p = null) {
        const {rr, txId: tx_id} = this;
        return getRSet(rr, tx_id, "write", q, p);
    }

    async commit() {
        const {rr, txId: tx_id} = this;

        const rset = await rr.send({
            fn: "tx/commit",
            args: {
                tx_id
            }
        });

        return new RSet(rset);
    }

    async rollback() {
        const {rr, txId: tx_id} = this;

        const rset = await rr.send({
            fn: "tx/rollback",
            args: {
                tx_id
            }
        });

        return new RSet(rset);
    }
}


class RSet {
    res = null;
    rows_cache = null;

    constructor(res) {
        // @todo/low deep freeze object.
        this.res = res;
    }

    /**
     * Allow JS destructuring syntax by using a getter.
     * - E.g. `const {rows} = rset;`
     * Only compute rows when requested.
     */
    get rows() {
        if (this.rows_cache === null) {
            // Convert `[[1,2,3]]` into `[{x: 1, y: 2, z: 3}]`.
            const {col_names, rows: {data}} = this.res;
            const keys = col_names.map(({name}) => name);
            const o = [];

            for (const r of data) {
                const one = {};

                for (const [i, v] of r.entries()) {
                    one[keys[i]] = v;
                }
                o.push(one);
            }
            this.rows_cache = o;
        }
        return this.rows_cache;
    }

    get rowsAsArray() {
        return this.res.rows.data;
    }

    get cols() {
        return this.res.col_names.map(({name}) => name);
    }

    get colsOrigin() {
        return this.res.col_names.map(({name_origin}) => name_origin);
    }

    get rowsChanged() {
        const c = this.res.rows_changed;

        // `null` when the query is not an insert, update or delete.
        return c === null ? 0 : c;
    }
}

export {
    ReadTx,
    WriteTx
}

