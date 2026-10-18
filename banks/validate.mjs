import {readFileSync} from 'node:fs';
import {validBankSnapshot} from './bank-portfolios-schema.js';
const data=JSON.parse(readFileSync(process.argv[2],'utf8'));
const previous=process.argv[3]?JSON.parse(readFileSync(process.argv[3],'utf8')):undefined;
if(!validBankSnapshot(data,new Date(),previous))throw Error('Bank snapshot failed cohort / identity / provenance / date validation; nothing published.');
console.log('PASS bank snapshot schema, official sources, common-date returns, identities and regression guards');
