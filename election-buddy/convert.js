#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const util = require('util');
const csvParse = util.promisify(require('csv-parse'));
const inputFile = process.argv[2] || 'vote_by_vote.csv';

main()
    .catch(function (err) {
        console.error(err);
        process.exit(1);
    });

async function main() {
    const chunks = fs.readFileSync(inputFile, 'utf8')
        .replace(/^\uFEFF/, '') // remove BOM
        .trim()
        .split(/\n\n+/);
    const votes = {};
    let ranked = false;
    let office = '';
    for (const chunk of chunks) {
        if (!office) {
            office = chunk;
        }
        else if (/^The highest ranked candidate gets the highest score/.test(chunk)) {
            ranked = true;
        }
        else {
            const csvData = await csvParse(chunk, {columns: true});
            assert(office, `Missing office for\n${chunk}`);
            assert(!votes[office], `Votes already seen for "${office}`);
            const convertedData = [];
            for (const row of csvData) {
                convertedData.push(transformRow(row, ranked));
            }
            votes[office] = convertedData;
            ranked = false;
            office = '';
        }
    }
    console.log(votes)
}

function transformRow(row, ranked) {
    const candidates = Object.keys(row).length - 4;
    const newRow = {Voter: row.Voter};
    for (const [name, value] of Object.entries(row)) {
        if (/Write-in|Voter|Ballot|Abstain/i.test(name)) {
            if (name !== 'Ballot') {
                newRow[name] = ranked ? value.replace(/(?<=\()(\d+)(?=\))/, (m, m1) => candidates - m1 + 1) : value;
            }
            continue;
        }
        const m = name.match(/(No Endorsement)|(\S+?)(?:\s*\([^)]*\))?$/i);
        assert(m, `Unexpected column header format "${name}"`);
        const newName = m[1] || m[2];
        let newValue = /^\d+$/.test(value) ? (ranked ? candidates - value + 1 : +value) : value;
        if (newValue > 2) { // allow ranking only 2
            newValue = '';
        }
        newRow[newName] = newValue;
    }
    return newRow;
}
