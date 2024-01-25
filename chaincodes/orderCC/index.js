'use strict';

const OrderChaincode = require('./lib/OrderChaincode.js')
module.exports.OrderChaincode = OrderChaincode
module.exports.contracts = [OrderChaincode]