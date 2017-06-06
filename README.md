## Zillow Sample Project

### Installing

Tested on node 6.10.3

`$ npm install`

### Running tests

`$ npm test`

### CLI app

`$ bin/fileSummary [--verbose] [--chars] [--encoding encoding] targetFile|-`

`--verbose` causes all intermediate chunk summaries to be outputted

`--chars` causes characters to be counted instead of bytes

`--encoding` changes the input encoding from the default of utf8

`targetFile` is either a file path or `-` to indicate stdin

### Library

#### SummaryTransformer

```javascript
new SummaryTransformer(options)
```

`options` additionally recognizes the key `countChars` to enable character counting mode. This will count characters in the input stream's encoding instead of bytes of raw data.

For each received string/buffer chunk, this transformer outputs an object that contains the elements

* `elapsed` - ms since the stream opened
* `lines` - number of lines counted
* `bytes` or `chars` - number of elements counted, depending on mode

#### SummaryReportTransformer

```javascript
new SummaryReportTransformer(options)
```

`options` does not recognize any extra keys.

Expects to receive objects outputted by `SummaryTransformer`

Does not output anything until the input stream is finished, at which point it outputs a one-line summary report containing the number of lines, bytes (or characters), elapsed time and throughput.

### Notes

Does not support classic MacOS line endings (`\r`)

For some reason throughput is improved by 30% or so when piping from stdin (via cat) compared to being directly passed a file path.