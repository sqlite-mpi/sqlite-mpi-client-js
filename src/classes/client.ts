import {
    toReqRes
} from "./../lib/iop-to-reqres";

import {
    throwIfError,
} from "./../lib-app/util";

import {ReadTx, WriteTx} from "./tx";

class Client {
    rr = null;

    constructor(iop) {
        const rr = toReqRes(iop);

        this.rr = throwIfError(rr);
    }

    newFileRef(absFile) {
        return new FileRef(this.rr, absFile);
    }
}

class FileRef {
    rr = null;
    absFile = null;

    constructor(rr, absFile) {
        this.rr = rr;
        this.absFile = absFile;
    }

    async getReadTx() {
        const {rr} = this;

        const {tx_id} = await rr.send({
            fn: "file/get_read_tx",
            args: {
                file: this.absFile
            }
        });

        return new ReadTx(rr, tx_id);
    }

    async getWriteTx() {
        const {rr} = this;

        const {tx_id} = await rr.send({
            fn: "file/get_write_tx",
            args: {
                file: this.absFile
            }
        });

        return new WriteTx(rr, tx_id);
    }
}

export {
    Client
}
