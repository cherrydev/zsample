'use strict';

const stream = require('stream');
const util = require('util');

/**
 * Transforms a character stream into an object stream that
 * contains elapsed time, lines and counted elements (bytes or characters)
 */
class SummaryTransformer extends stream.Transform {
    /**
     * @param {*} [options] - Stream options
     * @param {boolean} [options.countChars] - Use character count instead of bytes
     */
    constructor(options) {
        // No object spread available yet! Use Object.assign instead
        super(Object.assign(options || {}, {
            // To write objects, you set readableObjectMode. Hilarious.
            readableObjectMode: true
        }));
        this._start = Date.now();
        this._elements = 0;
        this._lines = 0;
        this._countChars = options && options["countChars"];
    }

    static _countLines(strVal) {
        let count = 0;
        let pos = strVal.indexOf('\n');
        while (pos !== -1) {
            count++;
            pos = strVal.indexOf('\n', pos + 1);
        }
        return count;
    }

    //noinspection JSUnusedGlobalSymbols
    _transform(chunk, encoding, cb) {
        const stringChunk = chunk.toString();
        if (this._countChars) {
            this._elements += stringChunk.length;
        }
        else {
            this._elements += Buffer.byteLength(stringChunk, encoding);
        }
        if (!this._lines && this._elements) {
            // We already have a first line if we have any data
            this._lines = 1;
        }
        this._lines += SummaryTransformer._countLines(stringChunk);
        this.push({
            elapsed: Date.now() - this._start,
            [this._countChars ? 'chars' : 'bytes'] : this._elements,
            lines: this._lines
        });
        cb();
    }
}

/**
 * A transform stream that collects summary objects from SummaryTransformer
 * and when the input stream is complete outputs a single line reporting the
 * final result.
 */
class SummaryReportTransformer extends stream.Transform {
    /**
     * @param {*} [options] - Stream options
     */
    constructor(options) {
        super(Object.assign(
            options || {}, {
            writableObjectMode : true
        }));
        this._lastSummary = {
            bytes : 0,
            lines: 0,
            elapsed: 0
        };
    }

    //noinspection JSUnusedGlobalSymbols
    /**
     *
     * @param chunk
     * @param ignoreEncoding
     * @param cb
     * @override
     * @private
     */
    _transform(chunk, ignoreEncoding, cb) {
        this._lastSummary = chunk;
        cb();
    }

    //noinspection JSUnusedGlobalSymbols
    /**
     *
     * @param cb
     * @private
     */
    _flush(cb) {
        const elementName = this._lastSummary.chars ? 'chars' : 'bytes';
        // Coerce to number in case they're both empty
        const elements = Number(this._lastSummary.bytes || this._lastSummary.chars);
        const format = 'lines: %d %s: %d elapsed: %dms rate: %d %s/s\n';
        this.push(util.format(format,
                this._lastSummary.lines,
                elementName,
                Number(this._lastSummary.bytes || this._lastSummary.chars) ,
                this._lastSummary.elapsed,
                Math.floor(elements / (this._lastSummary.elapsed / 1000)),
                elementName
            )
        );
        cb();
    }
}

module.exports = {
    SummaryTransformer,
    SummaryReportTransformer
};