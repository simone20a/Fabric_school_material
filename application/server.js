const express = require('express')
const app = express()
const port = 3000
const FabNetwork = require('./index')

app.use(express.static('public'))
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

app.post('/submitTX', async (req, res) => {
    const data = req.body
    const organization = data.organization
    const channel = data.channel
    const chaincode = data.chaincode
    const txName = data.txName
    const txParams = data.txParams

    const resultTx = await FabNetwork.submitT(organization, channel, chaincode, txName, txParams)
    res.send(resultTx)
})

app.listen(port, () => {
    console.log(`Server listening at ${port}`)
})