SQLite client for JavaScript.

See [sqlitempi.com](https://sqlitempi.com) for a general overview.

### Install

- `yarn add sqlite-mpi-client-js`
    - Or: `npm install --save sqlite-mpi-client-js`


### IO Providers

You also need to install an IO provider.

- [React Native](https://github.com/sqlite-mpi/smpi-iop-react-native) 
- [Node.js](https://github.com/sqlite-mpi/smpi-iop-node-ffi)

### Usage

See `./test/all` for detailed usage.


#### Get a file ref
```javascript
// Note: Example is for Node.js.
const {smpi} = require("sqlite-mpi-client-js");
const iop = require("smpi-iop-node-ffi");

const c = smpi.newClient(iop);
const f = c.newFileRef("/tmp/db-file.sqlite");
```

#### Write transactions

- There is only one active write transaction at a time per SQLite file.
    - This applies at an OS level, for all processes.

- Write tx requests will queue when there is an active outstanding write tx.
    - Queued write tx requests will resolve in First In First Out (FIFO) manner.
    - When the promise returned from `f.getWriteTx()` resolves, the `wtx` is active.


```javascript
const wtx = await f.getWriteTx();

// `q` can be a read or write with write txs.
await wtx.q("SELECT 1+1");

await wtx.read("SELECT 1+1");

await wtx.write("INSERT ...");

await wtx.commit();
// await wtx.rollback();
```

#### Read transactions

- Read transactions are concurrent; you can have many read transactions active and reading from the same database file.

```javascript
const rtx = await f.getReadTx();

// `q` must be a read.
await rtx.q("SELECT 1+1");

await rtx.read("SELECT 1+1");

// No writes.
// await tx.write("INSERT ...");

await rtx.commit();
// await rtx.rollback();
```



#### Params


```javascript
const wtx = await f.getWriteTx();

// Index based.
await wtx.write("INSERT INTO t1 (b) VALUES (?), (?)", [1, 2]);
await wtx.write("INSERT INTO t1 (b) VALUES (?1), (?2)", [3, 4]);

// Key based.
await wtx.write("INSERT INTO t1 (b) VALUES (:x), (:y)", {x: 1, y: 2});
await wtx.write("INSERT INTO t1 (b) VALUES (@x), (@y)", {x: 1, y: 2});
await wtx.commit();
```

### Notes

- SQLite `WAL` mode is always on; you can not turn it off.
- Reads are concurrent, writes queue.





