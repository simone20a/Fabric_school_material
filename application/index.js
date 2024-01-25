/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
const appRoot = require('app-root-path');
const grpc = require('@grpc/grpc-js')
const { connect, signers } = require('@hyperledger/fabric-gateway')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const { TextDecoder } = require('util')
const testNetDir = appRoot.path.split('/').slice(0, -1).join('/') + "/test-network";
// Path to crypto materials.
const cryptoPath = testNetDir + '/organizations/peerOrganizations/';

// Gateway peer endpoint
const peerEndpoints = {
    'suppliera.quotation.com': 'localhost:7051',
    'supplierb.quotation.com': 'localhost:9051',
    'agency.quotation.com': 'localhost:11051'
}

// mspIDs
const orgMspIds = {
    'suppliera.quotation.com': 'SupplierAMSP',
    'supplierb.quotation.com': 'SupplierBMSP',
    'agency.quotation.com': 'AgencyMSP'
}

const utf8Decoder = new TextDecoder();

/**
 * Establish client-gateway gRPC connection
 * @param {String} organization | organization domain
 * @returns gRPC client
 */
async function newGrpcConnection(organization) {
    // Gateway peer SSL host name override.
    const peerHostAlias = `peer0.${organization}`
    // Path to peer tls certificate.
    const tlsCertPath = path.join(cryptoPath, `${organization}/peers/${peerHostAlias}/tls/ca.crt`)

    const tlsRootCert = fs.readFileSync(tlsCertPath);
    const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);

    //Complete the gRCP Client connection here 
    return new grpc.Client(peerEndpoints[organization], tlsCredentials,
        { 'grpc.ssl_target_name_override': peerHostAlias }
    );
}

/**
 * Create a new user identity
 * @param {String} organization | organization domain
 * @returns the user credentials
 */
function newIdentity(organization) {
    // Path to user certificate
    const certPath = path.join(cryptoPath, `${organization}/users/User1@${organization}/msp/signcerts/User1@${organization}-cert.pem`)
    const mspId = orgMspIds[organization];
    //Retrieve and return credentials here ...
    const credentials = fs.readFileSync(certPath);
    return {mspId, credentials};
}

/**
 * Create a signing implementation
  * @param {String} organization | organization domain
  * @returns a new signing implementation for the user
 */
function newSigner(organization) {
    // Path to user private key directory.
    const keyDirectoryPath = path.join(cryptoPath, `${organization}/users/User1@${organization}/msp/keystore`)

    const files = fs.readdirSync(keyDirectoryPath)
    const keyPath = path.resolve(keyDirectoryPath, files[0])
    const privateKeyPem = fs.readFileSync(keyPath)
    const privateKey = crypto.createPrivateKey(privateKeyPem)
    //Create and return the signing implementation here
    return signers.newPrivateKeySigner(privateKey);
}

/**
 * Submit a transaction synchronously, blocking until it has been committed to the ledger.
  * @param {String} organization | organization domain
  * @param {String} channel | channel name
  * @param {String} chaincode | chaincode name 
  * @param {String} transactionName | transaction method
  * @param {Array} transactionParams | transaction parameters
  * @returns a new signing implementation for the user
 */
async function submitT(organization) {

    organization = organization.toLowerCase()

    console.log("\nCreating gRPC connection...")
    //Establish gRPC connection here
    const client = await newGrpcConnection(organization);

    console.log(`Retrieving identity for User1 of ${organization} ...`)
    //Retrieve User1's identity here
    const id = newIdentity(organization);

    //Retrieve signing implementation here
    const signer = newSigner(organization);

    //Complete the gateway connection here ...
    const gateway = connect({
        client,
        identity: id,
        signer: signer,
        // Default timeouts for different gRPC calls
        evaluateOptions: () => {
            return { deadline: Date.now() + 5000 }; // 5 seconds
        },
        endorseOptions: () => {
            return { deadline: Date.now() + 15000 }; // 15 seconds
        },
        submitOptions: () => {
            return { deadline: Date.now() + 5000 }; // 5 seconds
        },
        commitStatusOptions: () => {
            return { deadline: Date.now() + 60000 }; // 1 minute
        },
    })

    try {
        console.log(`Connecting to channels ...`)
        //Retrieve the channel here
        const q1network = gateway.getNetwork("q1channel");
        const q2network = gateway.getNetwork("q2channel");

        //Retrieve the contract here
        const orderContract = q1network.getContract("orderCC");
        const supplyContract = q2network.getContract("supplyCC");



        //Submit transaction here
        // let resp = null;

        // if (!transactionParams || transactionParams === '') {
        //     resp = await contract.submitTransaction(transactionName);
        // } else {
        //     resp = await contract.submitTransaction(transactionName, ...transactionParams);
        // }
        // const resultJson = utf8Decoder.decode(resp);

        // if (resultJson && resultJson !== null) {
        //     const result = JSON.parse(resultJson);
        //     console.log('*** Result:', result);
        // }
        // console.log('*** Transaction committed successfully');

        const events = await q1network.getChaincodeEvents("orderCC", {startBlock: BigInt(0)});
        console.log('*** application running');
        try {
            var max = 0;
            var maxID;
            var maxQuantity;
            for await (const event of events) {
                const asset = new TextDecoder().decode(event.payload);

                console.log(`*** Contract Event Received: ${event.eventName}`)
                console.log(`-- asset: ${asset}`)
                console.log(`-- chaincodeName: ${event.chaincodeName}`)
                console.log(`-- transactionId: ${event.transactionId}`)
                console.log(`-- blockNumber: ${event.blockNumber}\n`)
                if (event.blockNumber >= max) {
                    max = event.blockNumber;
                    maxID = JSON.parse(asset).orderId;
                    maxQuantity = JSON.parse(asset).quality;
                }
                console.log('*** max event ', max, " ", maxID, " ", maxQuantity);
                let supplyResp = await supplyContract.submitTransaction("getAllSupply");
                const resultJson = utf8Decoder.decode(supplyResp);
                if (resultJson && resultJson !== null) {
                    const supplyResult = JSON.parse(resultJson);
                    console.log('*** Result Supply:', supplyResult);
                }
                let orderResp = utf8Decoder.decode(await orderContract.submitTransaction("queryOrder", JSON.parse(asset).orderId));
                console.log('*** Result Order:', orderResp);
            }

            

            

            console.log('*** finished');


        } finally {
            events.close;
        }
    } catch (err) {
        console.error(err)
    } finally {
        gateway.close()
        client.close()
    }

}

function submit(organization) {
    submitT("agency.quotation.com");
}

module.exports = { submitT, submit }