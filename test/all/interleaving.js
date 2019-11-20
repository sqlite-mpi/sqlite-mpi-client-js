"use strict"

const _ = require("lodash");

const {
    getNewFileRef,
    sleep,
    isPending
} = require("./../util");


// Read transactions do not queue.
const assertCanGetManyReadTxs = async (f, count = 10) => {
    const all = [];
    for (let i = 0; i < count; i++) {
        all.push(f.getReadTx());
    }

    // Wait for all read tx's to return.
    await Promise.all(all);

    // Issue rollbacks without waiting for response.
    const end = [];
    for (const p of all) {
        end.push((await p).rollback());
    }

    // Wait for all rollback responses.
    await Promise.all(end);
};

const writeAndCommit = async (wtx, i) => {
    await wtx.write("INSERT INTO t1 (b) VALUES (?)", [i]);
    await wtx.commit();
};

const testOneFile = async (f) => {
    // Set up table.
    const wtx = await f.getWriteTx();
    await wtx.write("CREATE TABLE t1(a INTEGER PRIMARY KEY, b)");
    await wtx.commit();

    // Write transactions queue.
    const p = [
        f.getWriteTx(),
        f.getWriteTx(),
        f.getWriteTx(),
        f.getWriteTx(),
        f.getWriteTx()
    ];

    // Give enough time for all requests to be processed (and queued).
    await sleep(50);

    const count = p.length;
    for (let i = 0; i < count; i++) {
        await assertCanGetManyReadTxs(f);

        const p1 = _.remove(p, (x) => !isPending(x));

        // Assert: One active wtx at a time.
        expect(p1.length).toEqual(1);

        await writeAndCommit((await p1[0]), i);

        await assertCanGetManyReadTxs(f);
    }
    expect(p.length).toEqual(0);


    const rtx = await f.getReadTx();
    await maxTxIdReadable(rtx, count);
};


test("Interleaving transactions, single file.", async () => {
    const f = getNewFileRef();
    await testOneFile(f);
});

// Assert: Writes queue per file.
test("Interleaving transactions, many different files.", async () => {
    const totalFiles = 10;
    const tests = [];
    for (let i = 0; i < totalFiles; i++) {
        const f = getNewFileRef();
        tests.push(testOneFile(f));
    }
    await Promise.all(tests);

    // @todo/low `PRAGMA integrity_check` to make sure file is still valid.
});

/**
 * Assert: All tx numbers upto and including `num` can be read from the file.
 */
const maxTxIdReadable = async (tx, num) => {
    const r = await tx.read("SELECT b FROM t1 ORDER BY b ASC");

    const s1 = (new Array(num)).fill(0).map((x, i) => [i]);
    expect(r.rowsAsArray).toEqual(s1);
};

const insOne = async (f) => {
    const w1 = await f.getWriteTx();
    await w1.write("INSERT INTO t1 (b) VALUES ((SELECT ifnull(max(b) + 1, 0) FROM t1));");
    await w1.commit();
};

const readGroupMaxTxId = async (rg, maxTxId) => {
    await Promise.all(rg.map((rtx) => maxTxIdReadable(rtx, maxTxId)));
};

test("Isolation, read tx takes a snapshot.", async () => {
    const f = getNewFileRef();

    // Set up table.
    const wtx = await f.getWriteTx();
    await wtx.write("CREATE TABLE t1(a INTEGER PRIMARY KEY, b)");
    await wtx.commit();

    const rg1 = await Promise.all([
        f.getReadTx(),
        f.getReadTx(),
        f.getReadTx(),
    ]);

    await readGroupMaxTxId(rg1, 0);

    await Promise.all([
        insOne(f),
        insOne(f),
        insOne(f),
        insOne(f),
        insOne(f)
    ]);

    await readGroupMaxTxId(rg1, 0);

    const rg2 = await Promise.all([
        f.getReadTx(),
        f.getReadTx(),
        f.getReadTx(),
    ]);

    await readGroupMaxTxId(rg2, 5);
    await readGroupMaxTxId(rg1, 0);

});
