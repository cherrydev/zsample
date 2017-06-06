'use strict';

const fs = require('fs');
const {SummaryTransformer, SummaryReportTransformer} = require('../lib');
const StreamTest = require('streamtest').v2;

describe('SummaryTransformer', () => {
    describe('from basic strings', () => {
        function testBasicStrings(inputChunks, options, testFunc, cb) {
            StreamTest.fromChunks(inputChunks)
            .pipe(new SummaryTransformer(options))
            .pipe(StreamTest.toObjects((err, objs) => {
                expect(err).toBeFalsy();
                testFunc(objs);
                cb();
            }));
        }
        it('counts bytes', (done) => {
            testBasicStrings([('01234567890123456789')], null,
                (objs) => expect(objs[0].bytes).toBe(20), done);
        });
        it('counts chars', (done) => {
            testBasicStrings([('01234567890123456789')], {countChars : true},
                (objs) => expect(objs[0].chars).toBe(20), done);
        });
        it('counts lines', (done) => {
            testBasicStrings([('line1\nline2')], null,
                (objs) => expect(objs[0].lines).toBe(2), done);
        });
        it('counts a stream with no line endings as 1 line', (done) => {
            testBasicStrings([('This is all just one line without a line feed')], null,
                (objs) => expect(objs[0].lines).toBe(1), done);
        });
        it('counts a Windows EOL as a line feed', (done) => {
            testBasicStrings([('line1\r\nline2')], null,
                (objs) => expect(objs[0].lines).toBe(2), done);
        });
    });
    describe('from multi-chunk buffers', () => {
        it('counts a Windows EOL split across two chunks as a single line feed', (done) => {
            /* Originally I had used a regex to detect line feeds, but this failed
             when a \r\n was split across a chunk boundary. indexOf('\n') had much, much
             better throughput anyway.
             */
            StreamTest.fromChunks(['line1\r','\nline2'])
                .pipe(new SummaryTransformer())
                .pipe(StreamTest.toObjects((err, objs) => {
                    expect(err).toBeFalsy();
                    expect(objs[0].lines).toBe(1);
                    expect(objs[1].lines).toBe(2);
                    done();
                }));
        });
    });
    describe('from multi-byte utf8 files', () => {
        const multiByteFile = 'spec/samples/multibyte.txt';
        it('counts bytes regardless of encoding', (done) => {
            fs.createReadStream(multiByteFile, 'utf8')
            .pipe(new SummaryTransformer())
            .pipe(StreamTest.toObjects((err, objs) => {
                    expect(err).toBeFalsy();
                    let [last] = objs.slice(-1);
                    expect(last.bytes).toBe(5135); // checked with wc -c
                    done();
                }))
        });
        it('counts chars correctly', (done) => {
            fs.createReadStream(multiByteFile, 'utf8')
            .pipe(new SummaryTransformer({countChars : true}))
            .pipe(StreamTest.toObjects((err, objs) => {
                    expect(err).toBeFalsy();
                    let [last] = objs.slice(-1);
                    expect(last.chars).toBe(1777); // checked with wc -m
                    done();
                }));
        });
        it('counts chars as bytes when encoding set to ascii', (done) => {
            fs.createReadStream(multiByteFile, 'ascii')
            .pipe(new SummaryTransformer({countChars : true}))
            .pipe(StreamTest.toObjects((err, objs) => {
                    expect(err).toBeFalsy();
                    let [last] = objs.slice(-1);
                    expect(last.chars).toBe(5135);
                    done();
                }));
        });
    });
});

describe('SummaryReportTransformer', () => {
    const sampleSummary1 = {
        lines : 2,
        bytes: 255,
        elapsed: 10
    };
    const sampleSummary2 = {
        lines : 4,
        bytes: 258,
        elapsed: 12
    };
    function testSummaryToContain(summaries, forText, cb) {
        StreamTest.fromObjects(summaries)
            .pipe(new SummaryReportTransformer())
            .pipe(StreamTest.toText((err, str) => {
                expect(err).toBeFalsy();
                expect(str).toContain(forText);
                cb();
            }));
    }
    it('reports lines', (done) => {
        testSummaryToContain([sampleSummary1], 'lines: 2 ', done);
    });
    it('reports bytes', (done) => {
        testSummaryToContain([sampleSummary1], 'bytes: 255 ', done);
    });
    it('reports elapsed', (done) => {
        testSummaryToContain([sampleSummary1], 'elapsed: 10ms', done);
    });
    it('reports rate', (done) => {
        testSummaryToContain([sampleSummary1], 'rate: 25500 bytes/s', done);
    });
    it('reports only last chunk', (done) => {
        testSummaryToContain([sampleSummary1, sampleSummary2], 'elapsed: 12ms', done);
    })
});