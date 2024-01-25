#!/usr/bin/env node
const yargs = require('yargs')
const index = require('./index.js')

yargs
    .usage('$0 <cmd> [args]')
    .command('submit <organization> <channel> <chaincode> <transactionName> [transactionParams..]', 'Submit a transaction', (yargs) => {
        yargs
            .positional('organization', {
                type: 'string',
                describe: 'name of the organization',
                example: 'agency.quotation.com'
            })
            .positional('channel', {
                type: 'string',
                describe: 'name of the channel',
                example: 'q1channel'
            })
            .positional('chaincode', {
                type: 'string',
                describe: 'name of the chaincode',
                example: 'quotation'
            })
            .positional('transactionName', {
                type: 'string',
                describe: 'name of the transaction',
                example: 'requestQuotation'
            })
            .positional('transactionParams', {
                type: 'string',
                describe: 'transaction parameters',
                example: 'quotation1 laptop 500'
            })
    }, (argv) => {
        index.submit(
            argv.organization,
            argv.channel,
            argv.chaincode,
            argv.transactionName,
            argv.transactionParams);
    })
    .help()
    .alias('h', 'help')
    .demandCommand(1, 'You must specify a command.')
    .strict()
    .example('$0 submit agency.quotation.com q1channel quotation requestQuotation quotation1 laptop 500')
    .fail((msg, err, yargs) => {
        if (msg) console.error(msg);
        if (err) console.error(err);
        yargs.showHelp();
        process.exit(1);
    })
    .argv;