const axios = require('axios');

var JSON_ENABLED=false
var CURRENCY="USD"
// Min and Max unix timestamp
var START_DATE = new Date(-8640000000000000)
var END_DATE = new Date(8640000000000000)

function ethlog(msg) {
    if (!JSON_ENABLED) {
        console.log(msg)
    }
}

// Stolen from https://stackoverflow.com/questions/11832914/how-to-round-to-at-most-2-decimal-places-if-necessary
function roundHundredths(num) {
    return Math.round((num + Number.EPSILON) * 100) / 100
}

// This is split up entirely for the price fetch await(), which we can
// speed up later by Promising the entire array of transactions at once
async function processTx(tx) {
    // only take the details we care about
    var outtx = {
        hash: tx.hash,
        type: tx.type,
        value: tx.value,
        timeStamp: tx.timeStamp
    };

    // YYYY-MM-DD
    var date = new Date(tx.timeStamp * 1000);
    outtx.datestr = `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}`

    const curperethin = await axios.get(`https://api.coinbase.com/v2/prices/ETH-${CURRENCY}/spot?date=${outtx.datestr}`)
    outtx.curpereth = curperethin.data.data.amount;
    // probably inaccurate, but whatever
    // TODO Use BigNumber stuff
    outtx.eth = outtx.value / Math.pow(10, 18);
    outtx.cur = outtx.curpereth * outtx.eth

    return outtx
}

async function getethtxs(address) {
    var txs = (await axios.get(`https://api.etherscan.io/api?module=account&action=txlist&address=${address}`)).data
    if (txs.status == 0) {
        if (txs.message == "No transactions found") {
            return []
        }
        console.error("!!! Failed to get transaction data from etherscan.io!")
        console.error(`!!! Error message: ${txs.result}`)
        process.exit(-2)
    }
    return txs.result.filter(tx => tx.from == "0xea674fdde714fd979de3edf0f56aa9716b898ec8");
}

async function getpolytxs(address) {
    var txs = (await axios.get(`https://api.polygonscan.com/api?module=account&action=tokentx&address=${address}`)).data
    if (txs.status == 0) {
        if (txs.message == "No transactions found") {
            return []
        }
        console.error("!!! Failed to get transaction data from polygonscan.com!")
        console.error(`!!! Error message: ${txs.result}`)
        process.exit(-2)
    }
    return txs.result.filter(tx => tx.from == "0xc0899474fa0a2f650231befcd5c775c2d9ff04f1");
}

async function ethgettx(address) {
    try {
        // There are both Ethereum and Polygon payouts, that can be mixed in any order, so check both addresses
        // Also we only care about transactions coming from ethermine, so filter for those
        ethlog(`Fetching transactions for ${address}...`);
        const txlistprom = await Promise.all([getethtxs(address), getpolytxs(address)])
        const txlistinether = txlistprom[0]
        const txlistinpoly = txlistprom[1]
        // Mark the elements of each list so we know where they came from
        txlistinether.forEach(tx => tx.type = "Ethereum")
        txlistinpoly.forEach(tx => tx.type = "Polygon")
        const txlist = txlistinether.concat(txlistinpoly);

        ethlog("Processing transactions...");
        // We are accumulating Promise's into midlist here, to be awaited later
        // Otherwise this can take a while
        var midlist = []
        // for loop to filter out transactions from outside our date range
        for (tx of txlist) {
            // YYYY-MM-DD
            var date = new Date(tx.timeStamp * 1000);
            if ((date.getTime() > END_DATE.getTime()) ||
                (date.getTime() < START_DATE.getTime())) {
                continue
            }
            midlist.push(processTx(tx))
        }

        var outlist = await Promise.all(midlist)
        var totaleth = outlist.reduce((total, tx) => total + tx.eth, 0)
        var totalcur = outlist.reduce((total, tx) => total + tx.cur, 0)

        // Print info for each transaction
        if (JSON_ENABLED) {
            console.log(JSON.stringify({txs: outlist, totaleth: totaleth, totalcur: totalcur}, null, 2))
        } else {
            for (outtx of outlist) {
                ethlog(`TX Hash: ${outtx.hash}`)
                ethlog(`  Network: ${outtx.type}`)
                ethlog(`  Date: ${outtx.datestr}`)
                ethlog(`  ETH Price: ${outtx.curpereth}`)
                ethlog(`  ETH Received: ${outtx.eth}`)
                ethlog(`  ${CURRENCY} Value: ${roundHundredths(outtx.cur)}`)
            }
        }

        // print total values for ETH and CURRENCY
        ethlog(`Total ETH: ${totaleth}`)
        ethlog(`Total ${CURRENCY}: ${roundHundredths(totalcur)}`)

    } catch (error) {
        console.error(error);
    }
}

var argv = require('minimist')(process.argv.slice(2), {string: "_"});

if (argv._[0] === undefined) {
    console.error("No address specified!");
    process.exit(-1)
}

if (argv.hasOwnProperty('startdate')) {
    START_DATE = new Date(argv.startdate)
}

if (argv.hasOwnProperty('enddate')) {
    END_DATE = new Date(argv.enddate)
}

if (argv.hasOwnProperty('currency')) {
    CURRENCY = argv.currency
}

if (argv.json) {
    JSON_ENABLED = true;
}

ethgettx(argv._[0])
