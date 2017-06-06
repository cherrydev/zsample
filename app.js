'use strict';

const fs = require('fs');
const {SummaryTransformer, SummaryReportTransformer} = require('./lib');


class Cli {
    /**
     * Command line runner
     * @param {*} [options] - Options passed on to both transformer streams
     * @param {boolean} [options.verbose] - indicates intermediary summaries to be printed
     * @param {Stream} [options.stream] - readable input stream to be summarized
     */
    constructor(options) {
        this._stream = options.stream;
        this._verbose = !!options.verbose;
        this._options = options;
    }

    execute() {
        var onSummaryData = this._verbose ? Cli._log : () => {};
        this._stream.pipe(new SummaryTransformer(this._options))
            .on('data', onSummaryData)
            .pipe(new SummaryReportTransformer(this._options))
            .pipe(process.stdout);
    }

    static _log(data) {
        console.log(data);
    }
}

function printUsage() {
    let exe = process.argv[1] || 'fileSummary';
    console.warn("Usage: " + exe + " [--verbose] [--chars] [--encoding utf8] file|-");
    process.exit(1);
}

let options = {};
let encoding;
if (process.argv) {
    let allArgs = process.argv.slice(2);
    if (allArgs.length < 1) {
        printUsage();
    }
    let optionArgs = allArgs.slice(0, -1);
    let [fileName] = allArgs.slice(-1);
    for(let i = 0; i < optionArgs.length; i++) {
        switch(optionArgs[i]) {
            case '--verbose': {
                options.verbose = true;
                break;
            }
            case '--chars' : {
                options.countChars = true;
                break;
            }
            case '--encoding' : {
                encoding = optionArgs[++i];
                if (! Buffer.isEncoding(encoding)) {
                    console.warn("Invalid encoding " + encoding);
                    printUsage();
                }
                break;
            }
        }
    }
    if (fileName === '-') {
        if (encoding) process.stdin.setEncoding(encoding);
        options.stream = process.stdin;
    }
    else {
        options.stream = fs.createReadStream(fileName, encoding);
    }
}

 new Cli(options).execute();
