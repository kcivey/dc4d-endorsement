#!/usr/bin/env node
'use strict';

const findConfig = require('find-config');
const dotEnvResult = require('dotenv').config({path: findConfig('.env')});
const assert = require('assert');
const fs = require('fs');
const util = require('util');
const csvParse = util.promisify(require('csv-parse'));
const {google} = require('googleapis');
const inputFile = process.argv[2] || 'vote_by_vote.csv';
const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
const googleAccountKey = require(findConfig(process.env.GOOGLE_ACCOUNT_KEY_FILE));

if (dotEnvResult.error) {
    throw dotEnvResult.error;
}

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
    const auth = new google.auth.JWT(
        googleAccountKey.client_email,
        null,
        googleAccountKey.private_key,
        ['https://www.googleapis.com/auth/spreadsheets']
    );
    const sheets = google.sheets({version: 'v4', auth});
    const result = await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: "'EB Votes'",
        auth,
    });
    if (result.statusText !== 'OK') {
        console.warn(result);
        throw new Error('Error in clearing sheet');
    }
    const votes = {};
    let ranked = false;
    let office = '';
    let rowNumber = 1;
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
            convertedData.sort((a, b) => a.Voter.localeCompare(b.Voter));
            votes[office] = convertedData;
            const spreadsheetData = [
                [office],
                Object.keys(convertedData[0]),
                ...convertedData.map(Object.values),
            ];
            const result = await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `'EB Votes'!A${rowNumber}`,
                valueInputOption: 'RAW',
                resource: {
                    values: spreadsheetData,
                },
                auth,
            });
            if (result.statusText !== 'OK') {
                console.warn(result);
                throw new Error('Error in updating sheet');
            }
            ranked = false;
            office = '';
            rowNumber += spreadsheetData.length + 1;
        }
    }
}

function transformRow(row, ranked) {
    const candidates = Object.keys(row).length - 4;
    const newRow = {Voter: row.Voter};
    let usedFirstChoice = false;
    for (const [name, value] of Object.entries(row)) {
        if (/Write-in|Voter|Ballot|Abstain/i.test(name)) {
            if (name !== 'Ballot') {
                newRow[name] = ranked ? value.replace(/(?<=\()(\d+)(?=\))/, (m, m1) => candidates - m1 + 1) : value;
                if (/Write-in/i.test(name) && /\(1\)$/.test(newRow[name])) {
                    usedFirstChoice = true;
                }
            }
            continue;
        }
        const m = name.match(/(No Endorsement)|(\S+?)(?:\s*\([^)]*\))?$/i);
        assert(m, `Unexpected column header format "${name}"`);
        const newName = m[1] || m[2];
        const newValue = /^\d+$/.test(value) ? (ranked ? candidates - value + 1 : +value) : value;
        // if (newValue > 2) { // allow ranking only 2
        //     newValue = '';
        // }
        if (newValue === 1) {
            usedFirstChoice = true;
        }
        newRow[newName] = newValue;
    }
    if (!usedFirstChoice && ! row.Abstain) {
        console.warn('No first choice', row, newRow);
    }
    return newRow;
}
