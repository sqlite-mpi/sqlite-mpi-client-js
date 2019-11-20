"use strict"

const {
    getNewFileRef,
} = require("./../util");

test("Params, placeholders, ok.", async () => {
    const f = getNewFileRef();
    const wtx = await f.getWriteTx();
    await wtx.write("CREATE TABLE t1(a INTEGER PRIMARY KEY, b)");

    // Index based.
    await wtx.write("INSERT INTO t1 (b) VALUES (?), (?)", [1, 2]);
    await wtx.write("INSERT INTO t1 (b) VALUES (?1), (?2)", [3, 4]);

    // Key based.
    const xy = (x) => ({x, y: x + 1});
    await wtx.write("INSERT INTO t1 (b) VALUES (:x), (:y)", xy(5));
    await wtx.write("INSERT INTO t1 (b) VALUES (@x), (@y)", xy(7));
    const r2 = await wtx.write("INSERT INTO t1 (b) VALUES ($x), ($y)", xy(9));

    const r = await wtx.read("SELECT * FROM t1");

    const s1 = [
        {a: 1, b: 1},
        {a: 2, b: 2},
        {a: 3, b: 3},
        {a: 4, b: 4},
        {a: 5, b: 5},
        {a: 6, b: 6},
        {a: 7, b: 7},
        {a: 8, b: 8},
        {a: 9, b: 9},
        {a: 10, b: 10}
    ];

    expect(r.rows).toEqual(s1);

    await wtx.commit();
});


// Assert: If null or undefined passed, assume user meant to run query without binding values.
test("Params, placeholders, ok, unbound params with (null|undefined).", async () => {
    const f = getNewFileRef();

    const wtx = await f.getWriteTx();
    await wtx.write("CREATE TABLE t1(a INTEGER PRIMARY KEY, b)");

    // Index based.
    await wtx.write("INSERT INTO t1 (b) VALUES (?), (?)", null);
    await wtx.write("INSERT INTO t1 (b) VALUES (?), (?)", undefined);

    // Key based.
    await wtx.write("INSERT INTO t1 (b) VALUES (:x), (:y)", null);
    await wtx.write("INSERT INTO t1 (b) VALUES (:x), (:y)", undefined);


    const r = await wtx.read("select * from t1");

    const s1 = [
        {a: 1, b: null},
        {a: 2, b: null},
        {a: 3, b: null},
        {a: 4, b: null},
        {a: 5, b: null},
        {a: 6, b: null},
        {a: 7, b: null},
        {a: 8, b: null}
    ];

    expect(r.rows).toEqual(s1);
    await wtx.commit();
});

test("Params, placeholders, error.", async () => {
    const f = getNewFileRef();
    const wtx = await f.getWriteTx();
    await wtx.write("CREATE TABLE t1(a INTEGER PRIMARY KEY, b)");


    // Index based.

    // Too many args.
    const a = wtx.write("INSERT INTO t1 (b) VALUES (?), (?)", [1, 2, 3]);
    await expect(a).rejects.toBeInstanceOf(Error);


    // All placeholders are not bound.
    const b = wtx.write("INSERT INTO t1 (b) VALUES (?), (?)", [1]);
    await expect(b).rejects.toBeInstanceOf(Error);


    // SQLite does not have booleans; use integers 1 or 0.
    // @todo/low Auto translate booleans?
    const i = wtx.write("INSERT INTO t1 (b) VALUES (?), (?)", [true, false]);
    await expect(i).rejects.toBeInstanceOf(Error);

    // Invalid param type.
    // Note: this error is triggered by native (not JS).
    const b1 = wtx.write("INSERT INTO t1 (b) VALUES (?), (?)", [1, {a: 1}]);
    await expect(b1).rejects.toBeInstanceOf(Error);


    // Key based.

    // All placeholders are not bound.
    const c = wtx.write("INSERT INTO t1 (b) VALUES (:x), (:y)", {x: 1});
    await expect(c).rejects.toBeInstanceOf(Error);


    // Invalid param types.
    // Note: this error is triggered by JS, not native.
    const d = wtx.write("INSERT INTO t1 (b) VALUES (:x), (:y)", 123);
    await expect(d).rejects.toBeInstanceOf(Error);


    const h = wtx.write("INSERT INTO t1 (b) VALUES (:x), (:y)", [[]]);
    await expect(h).rejects.toBeInstanceOf(Error);


    await wtx.commit();
});


test("Params, types, basic.", async () => {
    const f = getNewFileRef();
    const wtx = await f.getWriteTx();
    await wtx.write("CREATE TABLE t1(a INTEGER PRIMARY KEY, b, c, d, e)");


    const unicode = `٩(-̮̮̃-̃)۶ ٩(●̮̮̃•̃)۶ ٩(͡๏̯͡๏)۶ ٩(-̮̮̃•̃).`;
    await wtx.write("INSERT INTO t1 (b, c, d, e) VALUES (?, ?, ?, ?)", [123, 123.123, "str", unicode]);
    const r = await wtx.read("select * from t1");

    const s1 = [
        {
            a: 1,
            b: 123,
            c: 123.123,
            d: 'str',
            e: unicode
        }
    ];

    expect(r.rows).toEqual(s1);
});


// Assert: SQLite can store and return the full range of valid JS integers.
test("Params, types, int boundaries.", async () => {
    const f = getNewFileRef();
    const wtx = await f.getWriteTx();
    await wtx.write("CREATE TABLE t1(a INTEGER PRIMARY KEY, b, c, d, e)");


    const min = Number.MIN_SAFE_INTEGER;
    const max = Number.MAX_SAFE_INTEGER;


    await wtx.write("INSERT INTO t1 (b, c, d, e) VALUES (?, ?, ?, ?)", [min - 1, min, min + 1, min * 2]);
    await wtx.write("INSERT INTO t1 (b, c, d, e) VALUES (?, ?, ?, ?)", [min - 10, min, min + 10, min * min]);

    await wtx.write("INSERT INTO t1 (b, c, d, e) VALUES (?, ?, ?, ?)", [max - 1, max, max + 1, max * 2]);
    await wtx.write("INSERT INTO t1 (b, c, d, e) VALUES (?, ?, ?, ?)", [max - 10, max, max + 10, max * max]);


    const r = await wtx.read("select * from t1");

    const s1 = [
        {
            a: 1,
            b: -9007199254740992,
            c: -9007199254740991,
            d: -9007199254740990,
            e: -18014398509481982
        },
        {
            a: 2,
            b: -9007199254741000,
            c: -9007199254740991,
            d: -9007199254740981,
            e: 8.112963841460666e+31
        },
        {
            a: 3,
            b: 9007199254740990,
            c: 9007199254740991,
            d: 9007199254740992,
            e: 18014398509481982
        },
        {
            a: 4,
            b: 9007199254740981,
            c: 9007199254740991,
            d: 9007199254741000,
            e: 8.112963841460666e+31
        }
    ];

    // Note: Beyond max, comparisons return true for any two ints?
    expect(r.rows).toEqual(s1);


    // @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/MAX_SAFE_INTEGER
    expect(Number.MAX_SAFE_INTEGER).toEqual(9007199254740991);

    const x = Number.MAX_SAFE_INTEGER + 1; // expected output: 9007199254740991
    const y = Number.MAX_SAFE_INTEGER + 2; // expected output: 9007199254740992

    // Assert: Beyond `MAX_SAFE_INTEGER`, comparisons are true, even though console.log shows them to be different?
    expect(x).toEqual(y);

});


// @todo/low Allow auto parsing for date and JSON strings?
test("Params, types, dates and JSON.", async () => {
    const f = getNewFileRef();
    const wtx = await f.getWriteTx();
    await wtx.write("CREATE TABLE t1(a INTEGER PRIMARY KEY, b, c JSON)");

    // Assert: `toISOString()` is used by default when encoding JS date to JSON.
    const date = {
        i: new Date("14 March 1879"),
        o: "1879-03-14T00:00:00.000Z"
    };

    // Note: above test confirms failure when passing an object as an argument.
    // - Default to allow applications to define their JSON encode/decode rules to allow custom rules for dates/JSON.
    const j = `{"a":1}`;
    const json = {
        i: j,
        o: j
    };

    await wtx.write("INSERT INTO t1 (b, c) VALUES (?, ?)", [date.i, json.i]);
    const r = await wtx.read("select * from t1");

    const s1 = [
        {a: 1, b: '1879-03-14T00:00:00.000Z', c: '{"a":1}'}
    ];

    expect(r.rows).toEqual(s1);
});


