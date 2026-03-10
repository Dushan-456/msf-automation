const fs = require('fs');
const csv = require('csv-parser');

const fd = fs.openSync('../test-doctors.csv', 'r');
const buffer = Buffer.alloc(1024);
const bytesRead = fs.readSync(fd, buffer, 0, 1024, 0);
fs.closeSync(fd);

let encoding = 'utf8';
let separator = ',';

if (bytesRead >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
    encoding = 'utf16le';
}

const firstChunk = buffer.toString(encoding, 0, bytesRead);
const firstLine = firstChunk.split('\n')[0];
if (firstLine.includes('\t') && !firstLine.includes(',')) {
    separator = '\t';
} else if (firstLine.includes(';') && !firstLine.includes(',')) {
    separator = ';';
}

fs.createReadStream('../test-doctors.csv', { encoding })
    .pipe(csv({ 
        separator: separator,
        mapHeaders: ({ header }) => header
            .replace(/^\ufeff/gi, '')
            .replace(/^"|"$/g, '')
            .replace(/[\r\n]+/g, '')
            .trim(),
        mapValues: ({ value }) => typeof value === 'string' ? value.replace(/[\r\n]+/g, '').trim() : value
    }))
    .on('data', (data) => console.log('Parsed Row:', data))
    .on('end', () => console.log('Done'));
