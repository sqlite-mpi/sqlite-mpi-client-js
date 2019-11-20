import {
    Client
} from "./classes/client";

const smpi = {
    newClient: (iop) => {
        return new Client(iop);
    }


    // @todo/low `newClientRequestResponse(rr)`. Allow passing messages over request response APIs (E.g. HTTP, `fetch`).
    // - This would not support bidirectional streaming, e.g. to get SQLite error log callback errors.
};

export {
    smpi
}
