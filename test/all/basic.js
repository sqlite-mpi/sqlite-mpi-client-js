"use strict"

const {
    getNewFileRef,
} = require("./../util");
/**
 * Note: Comprehensive tests related to concurrency/transactions are part of the `smpi` binary.
 * - These tests are to test the JS APIs in particular.
 */

test("Basic read and write tx methods.", async () => {
    const f = getNewFileRef();
    const tx = await f.getWriteTx();

    await tx.q("CREATE TABLE t1(a INTEGER PRIMARY KEY, b)");

    const rB = await tx.q("INSERT INTO t1 (b) VALUES (11), (22), (33)");
    expect(rB.rowsChanged).toEqual(3);

    const rC = await tx.q("SELECT *, 1+1 as col_alias FROM t1");
    expect(rC.rowsChanged).toEqual(0);
    const result = [
        {a: 1, b: 11, col_alias: 2},
        {a: 2, b: 22, col_alias: 2},
        {a: 3, b: 33, col_alias: 2}
    ];
    expect(rC.rows).toEqual(result);

    expect(rC.cols).toEqual(['a', 'b', 'col_alias']);
    expect(rC.colsOrigin).toEqual(['a', 'b', null]);

    await tx.commit();


    // This wtx has already closed, so the txId is no longer valid.
    try {
        await tx.q("SELECT *, 1+1 as col_alias FROM t1");
    } catch (e) {
        expect(e.message.includes("TxOp/InvalidTxId")).toBe(true);
    }


    const rtx = await f.getReadTx();
    const rD = await rtx.q("SELECT *, 1+1 as col_alias FROM t1");
    expect(rD.rows).toEqual(result);
    await rtx.commit();
});


/**
 * The read/write transaction function names allow the user the categorise the operation.
 * - This encodes it into the AST of JS to enable finding all reads/writes.
 * - `q` can be used to mean "this can be a read or write".
 */
test("SQL string operation type must match JS function for read and write tx operations.", async () => {
    const f = getNewFileRef();
    const wtx = await f.getWriteTx();

    await wtx.write("CREATE TABLE t1(a INTEGER PRIMARY KEY, b)");

    const isRead = "SELECT * FROM t1";
    const isWrite = "INSERT INTO t1 (b) VALUES (123)";


    await wtx.read(isRead);
    const p2 = wtx.read(isWrite);
    await expect(p2).rejects.toBeInstanceOf(Error);


    await wtx.write(isWrite);
    const p3 = wtx.write(isRead);
    await expect(p3).rejects.toBeInstanceOf(Error);

    // Assert: `q` can be read or write (its not categorised).
    await wtx.q(isRead);
    await wtx.q(isWrite);

    await wtx.commit();


    const rtx = await f.getReadTx();

    // Assert: Although q is not categorised as a read/write, inside a read tx it can only issue reads.
    await rtx.q(isRead);
    const p1 = rtx.q(isWrite);
    await expect(p1).rejects.toBeInstanceOf(Error);

    await rtx.read(isRead);

    await rtx.rollback();
});
