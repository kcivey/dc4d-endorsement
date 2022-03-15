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
    let votes = {};
    let ranked = false;
    let office = '';
    let rowNumber = 1;
    let sheetName = '';
    for (const chunk of chunks) {
        if (!office) {
            office = chunk.replace(' Fage ', ' Fair ');
            votes = {};
            rowNumber = 1;
            sheetName = office.replace(/^Council | \(.*/, '');
            /*
            const result = await sheets.spreadsheets.values.clear({
                spreadsheetId,
                range: `'${sheetName}'`,
                auth,
            });
            if (result.statusText !== 'OK') {
                console.warn(result);
                throw new Error('Error in clearing sheet');
            }
             */
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
            const counts = {};
            for (const row of convertedData) {
                if (row.Abstain) {
                    continue;
                }
                const first = Object.keys(row).find(n => row[n] === 1) || '';
                const second = Object.keys(row).find(n => row[n] === 2) || '';
                if (!counts[first]) {
                    counts[first] = {TOTAL: 0};
                }
                counts[first].TOTAL++;
                if (!counts[first][second]) {
                    counts[first][second] = 1;
                }
                else {
                    counts[first][second]++;
                }
            }
            const firstChoices = Object.keys(counts)
                .sort((a, b) => (counts[b].TOTAL - counts[a].TOTAL) || a.localeCompare(b));
            for (const first of firstChoices) {
                const secondChoices = Object.keys(counts[first]).filter(n => n !== 'TOTAL')
                    .sort((a, b) => (counts[first][b] - counts[first][a]) || a.localeCompare(b));
                let c1 = first;
                let c2 = counts[first].TOTAL;
                for (const second of secondChoices) {
                    console.log(`${c1}\t${c2}\t${second || 'No endorsement'}\t${counts[first][second]}`);
                    c1 = '';
                    c2 = '';
                }
            }
            votes[office] = convertedData;
            const spreadsheetData = [
                [office],
                Object.keys(convertedData[0]),
                ...convertedData.map(Object.values),
            ];
            /*
            const result = await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `'${sheetName}'!A${rowNumber}`,
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
             */
            ranked = false;
            office = '';
            rowNumber += spreadsheetData.length + 1;
        }
    }
}

function transformRow(row, ranked) {
    const candidates = Object.keys(row).filter(name => !/Write-in|Voter|Ballot|Abstain/i.test(name)).length;
    const newRow = {Voter: row.Voter};
    let usedFirstChoice = false;
    for (const [name, value] of Object.entries(row)) {
        if (/Write-in|Voter|Ballot|Abstain/i.test(name)) {
            if (name !== 'Ballot') {
                newRow[name] = ranked ? value.replace(/(?<=\()(\d+)(?=\))/, (m, m1) => candidates - m1 + 1) : value;
                if (/Write-in/i.test(name)) {
                    if (/\(1\)$/.test(newRow[name])) {
                        usedFirstChoice = true;
                    }
                    else if (/\((?:[2-9]|\d\d+)\)$/.test(newRow[name])) {
                        newRow[name] = '';
                    }
                }
            }
            continue;
        }
        const m = name.match(/(No Endorsement)|(\S+?)(?: [JS]r\.)?(?:\s*\([^)]*\))?$/i);
        assert(m, `Unexpected column header format "${name}"`);
        const newName = m[2] === 'Jenkins'
            ? name.replace(/^(\w)\S+/, '$1')
            : (m[1] ? 'No Endorsement' : m[2]);
        let newValue = /^\d+$/.test(value) ? (ranked ? candidates - value + 1 : +value) : value;
        if (newValue > 2) { // allow ranking only 2
            newValue = '';
        }
        if (newValue === 1) {
            usedFirstChoice = true;
        }
        newRow[newName] = newValue;
    }
    if (!usedFirstChoice && !row.Abstain) {
        console.warn('No first choice', row, newRow);
    }
    for (const [name, value] of Object.entries(newRow)) {
        if (value === 2 && (name === 'No Endorsement' || newRow['No Endorsement'] === 1)) {
            // Omit second choice if it's No Endorsement or if first choice is No Endorsement
            newRow[name] = '';
        }
    }
    return newRow;
}
