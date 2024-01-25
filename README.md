[//]: # (SPDX-License-Identifier: CC-BY-4.0)

# Basic commands to interact with the network

- Move inside to the *test-network* folder:
```
cd ./test-network
```

- To start the network:
```
./network.sh up
```

- To create the channels (if you execute this command without `./network.sh up` the script will start the network before creating the channels):
```
./network.sh createChannel
```

- To deploy a chaincode:
```
./network.sh deployCC -ccn chaincode_name
```

- To invoke a method of a chaincode:
  - if the chaincode requires params
```
./network.sh cc invoke -ccn chaincode_name -c channel_name -org organization_number -ccic '"methodName","params1","params2",...,"paramsN"'
```
  - if the chaincode doesn't require any param
```
./network.sh cc invoke -ccn chaincode_name -c channel_name -org organization_number -ccic '"methodName"'
```

- To make a query to the chaincode:
```
./network.sh cc query -ccn chaincode_name -c channel_name -org organization_number -ccqc '"methodName"'
```

- To shut down the network by cleaning it:
```
./network.sh down
```

# Interacting with the application

## Option 1 - Web-App

- Move inside the *application* folder:
```
cd ./application
```

- Open up *application/index.html* and add your codespace address at line 107 :
```
xhr.open("POST", "https://your-codespace-ID-3000.app.github.dev/submitTX", true)
```

- Install the dependencies:
```
npm install
```

- Start the server:
```
npm start
```

The web form for executing the functions will be available at:
```
  https://your-codespace-ID-3000.app.github.dev/home.html
```

## Option 2 - CLI

- Simply invoke the commands.js submit script:
```
node commands.js submit <organization> <channel> <chaincode> <transactionName> [transactionParams..]
```


- For example, to invoke a transaction with parameters:
```
node commands.js submit agency.quotation.com q1channel quotation requestQuotation quotation2 item 20
```
```
node commands.js submit suppliera.quotation.com q1channel quotation getQuotation quotation2
```