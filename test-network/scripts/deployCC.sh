#!/bin/bash

source scripts/utils.sh

CC_NAME=$1
CC_SRC_PATH=${2:-"../chaincodes"}
CC_SRC_LANGUAGE=${3:-"javascript"}
CC_VERSION=${4:-"1.0"}
CC_SEQUENCE=${5:-"1"}
CC_INIT_FCN=${6:-"NA"}
CC_END_POLICY=${7:-"NA"}
CC_COLL_CONFIG=${8:-"NA"}
DELAY=${9:-"3"}
MAX_RETRY=${10:-"5"}
VERBOSE=${11:-"false"}

CC_SRC_PATH=$CC_SRC_PATH/$CC_NAME

println "executing with the following"
println "- CHANNEL_NAME: ${C_GREEN}q1channel, q2channel${C_RESET}"
println "- CC_NAME: ${C_GREEN}${CC_NAME}${C_RESET}"
println "- CC_SRC_PATH: ${C_GREEN}${CC_SRC_PATH}${C_RESET}"
println "- CC_SRC_LANGUAGE: ${C_GREEN}${CC_SRC_LANGUAGE}${C_RESET}"
println "- CC_VERSION: ${C_GREEN}${CC_VERSION}${C_RESET}"
println "- CC_SEQUENCE: ${C_GREEN}${CC_SEQUENCE}${C_RESET}"
println "- CC_END_POLICY: ${C_GREEN}${CC_END_POLICY}${C_RESET}"
println "- CC_COLL_CONFIG: ${C_GREEN}${CC_COLL_CONFIG}${C_RESET}"
println "- CC_INIT_FCN: ${C_GREEN}${CC_INIT_FCN}${C_RESET}"
println "- DELAY: ${C_GREEN}${DELAY}${C_RESET}"
println "- MAX_RETRY: ${C_GREEN}${MAX_RETRY}${C_RESET}"
println "- VERBOSE: ${C_GREEN}${VERBOSE}${C_RESET}"

INIT_REQUIRED="--init-required"
# check if the init fcn should be called
if [ "$CC_INIT_FCN" = "NA" ]; then
  INIT_REQUIRED=""
fi

if [ "$CC_END_POLICY" = "NA" ]; then
  CC_END_POLICY=""
else
  CC_END_POLICY="--signature-policy $CC_END_POLICY"
fi

if [ "$CC_COLL_CONFIG" = "NA" ]; then
  CC_COLL_CONFIG=""
else
  CC_COLL_CONFIG="--collections-config $CC_COLL_CONFIG"
fi

FABRIC_CFG_PATH=$PWD/../config/

# import utils
. scripts/envVar.sh
. scripts/ccutils.sh

function checkPrereqs() {
  jq --version > /dev/null 2>&1

  if [[ $? -ne 0 ]]; then
    errorln "jq command not found..."
    errorln
    errorln "Follow the instructions in the Fabric docs to install the prereqs"
    errorln "https://hyperledger-fabric.readthedocs.io/en/latest/prereqs.html"
    exit 1
  fi
}

#check for prerequisites
checkPrereqs

## package the chaincode
./scripts/packageCC.sh $CC_NAME $CC_SRC_PATH $CC_SRC_LANGUAGE $CC_VERSION 

PACKAGE_ID=$(peer lifecycle chaincode calculatepackageid ${CC_NAME}.tar.gz)

## Install chaincode on supplierA, supplierB and agency
infoln "Installing chaincode on SupplierA..."
installChaincode 1
infoln "Install chaincode on SupplierB..."
installChaincode 2
infoln "Install chaincode on Agency..."
installChaincode 3
## query whether the chaincode is installed
queryInstalled 3

# Deploy cc to q1channel
CHANNEL_NAME="q1channel"
resolveSequence

infoln "Deploy into channel q1channel"
## approve the definition for SupplierA
approveForMyOrg 1 $CC_SEQUENCE

## check whether the chaincode definition is ready to be committed
## expect SupplierA to have approved and Agency not to
checkCommitReadiness 1 "\"SupplierAMSP\": true" "\"AgencyMSP\": false"
checkCommitReadiness 3 "\"SupplierAMSP\": true" "\"AgencyMSP\": false"

## now approve also for Agency
approveForMyOrg 3 $CC_SEQUENCE

## check whether the chaincode definition is ready to be committed
## expect them both to have approved
checkCommitReadiness 1 "\"SupplierAMSP\": true" "\"AgencyMSP\": true"
checkCommitReadiness 3 "\"SupplierAMSP\": true" "\"AgencyMSP\": true"

## now that we know for sure both orgs have approved, commit the definition
commitChaincodeDefinition 1 3

## query on both orgs to see that the definition committed successfully
queryCommitted 1 
queryCommitted 3

## Invoke the chaincode - this does require that the chaincode have the 'initLedger'
## method defined
if [ "$CC_INIT_FCN" = "NA" ]; then
  infoln "Chaincode initialization is not required"
else
  chaincodeInvokeInit 1 3
fi


# Deploy cc to q2channel
CHANNEL_NAME="q2channel"

infoln "Deploy into channel q2channel"
## approve the definition for SupplierB
approveForMyOrg 2 $CC_SEQUENCE

## check whether the chaincode definition is ready to be committed
## expect SupplierA to have approved and Agency not to
checkCommitReadiness 2 "\"SupplierBMSP\": true" "\"AgencyMSP\": false"
checkCommitReadiness 3 "\"SupplierBMSP\": true" "\"AgencyMSP\": false"

## now approve also for Agency
approveForMyOrg 3 $CC_SEQUENCE

## check whether the chaincode definition is ready to be committed
## expect them both to have approved
checkCommitReadiness 2 "\"SupplierBMSP\": true" "\"AgencyMSP\": true"
checkCommitReadiness 3 "\"SupplierBMSP\": true" "\"AgencyMSP\": true"

## now that we know for sure both orgs have approved, commit the definition
commitChaincodeDefinition 2 3

## query on both orgs to see that the definition committed successfully
queryCommitted 2
queryCommitted 3

## Invoke the chaincode - this does require that the chaincode have the 'initLedger'
## method defined
if [ "$CC_INIT_FCN" = "NA" ]; then
  infoln "Chaincode initialization is not required"
else
  chaincodeInvokeInit 2 3
fi

exit 0