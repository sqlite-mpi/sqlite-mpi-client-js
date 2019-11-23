SQLite client for JavaScript.

See [sqlitempi.com](https://sqlitempi.com) for a general overview.

### Install

- `yarn add sqlite-mpi-client-js`
    - Or: `npm install --save sqlite-mpi-client-js`


### IO Providers

You also need to install an IO provider.

- [React Native](https://github.com/sqlite-mpi/smpi-iop-react-native) 


### Usage

See `./test/all` for detailed usage.


```javascript

// Note: Example is for Node.js.
const {smpi} = require("sqlite-mpi-client-js");
const iop = require("smpi-iop-node-ffi");

const c = smpi.newClient(iop);
const f = c.newFileRef("/tmp/db-file.sqlite");


// Write Transaction.
const wtx = await f.getWriteTx();

// `q` can be a read or write with write txs.
await wtx.q("SELECT 1+1");
await wtx.read("SELECT 1+1");
await wtx.write("INSERT ...");

await wtx.commit();
// await wtx.rollback();



// Read Transaction.
const rtx = await f.getReadTx();

// `q` must be a read.
const rtx = await f.getReadTx();
await rtx.q("SELECT 1+1");

await rtx.read("SELECT 1+1");

// No writes.
// await tx.write("INSERT ...");


await rtx.commit();
// await rtx.rollback();



// Params
const wtx = await f.getWriteTx();

// Index based.
await wtx.write("INSERT INTO t1 (b) VALUES (?), (?)", [1, 2]);
await wtx.write("INSERT INTO t1 (b) VALUES (?1), (?2)", [3, 4]);

// Key based.
await wtx.write("INSERT INTO t1 (b) VALUES (:x), (:y)", {x: 1, y: 2});
await wtx.write("INSERT INTO t1 (b) VALUES (@x), (@y)", {x: 1, y: 2});
await rtx.commit();
```

### Notes

- SQLite `WAL` mode is always on; you can not turn it off.
- Reads are concurrent, writes queue.





