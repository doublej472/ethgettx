const axios = require('axios');

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

    const usdperethin = await axios.get(`https://api.coinbase.com/v2/prices/ETH-USD/spot?date=${outtx.datestr}`)
    outtx.usdpereth = usdperethin.data.data.amount;
    // probably inaccurate, but whatever
    // TODO Use BigNumber stuff
    outtx.eth = outtx.value / Math.pow(10, 18);
    outtx.usd = outtx.usdpereth * outtx.eth

    return outtx
}

async function ethgettx(address, year, month) {
    try {
        // There are both Ethereum and Polygon payouts, that can be mixed in any order, so check both addresses
        // Also we only care about transactions coming from ethermine, so filter for those
        console.log(`Fetching Ethereum transactions for ${address}...`);
        const txlistinether = (await axios.get(`https://api.etherscan.io/api?module=account&action=txlist&address=${address}`)).data.result.filter(tx => tx.from == "0xea674fdde714fd979de3edf0f56aa9716b898ec8");
        console.log(`Fetching Polygon transactions for ${address}...`);
        const txlistinpoly = (await axios.get(`https://api.polygonscan.com/api?module=account&action=tokentx&address=${address}`)).data.result.filter(tx => tx.from == "0xc0899474fa0a2f650231befcd5c775c2d9ff04f1");
        // Mark the elements of each list so we know where they came from
        txlistinether.forEach(tx => tx.type = "Ethereum")
        txlistinpoly.forEach(tx => tx.type = "Polygon")
        const txlist = txlistinether.concat(txlistinpoly);

        console.log("Processing transactions...");
        // We are accumulating Promise's into midlist here, to be awaited later
        // Otherwise this can take a while
        var midlist = []
        for (tx of txlist) {
            // YYYY-MM-DD
            var date = new Date(tx.timeStamp * 1000);
            // If the year is specified and the year doesn't match, skip
            if (year != -1 && date.getUTCFullYear() != year) {
                return;
            }
            // If the month is specified and the month doesn't match, skip
            if (month != -1 && date.getUTCMonth() + 1 != month) {
                return;
            }

            midlist.push(processTx(tx))
        }

        var outlist = await Promise.all(midlist)

        // Print info for each transaction
        for (outtx of outlist) {
            console.log(`TX Hash: ${outtx.hash}`)
            console.log(`  Type: ${outtx.type}`)
            console.log(`  Date: ${outtx.datestr}`)
            console.log(`  ETH Price: ${outtx.usdpereth}`)
            console.log(`  Amount Received: ${outtx.eth}`)
            console.log(`  USD Value: ${roundHundredths(outtx.usd)}`)
        }

        // print total values for ETH and USD
        console.log(`Total ETH: ${outlist.reduce((total, tx) => total + tx.eth, 0)}`)
        console.log(`Total USD: $${roundHundredths(outlist.reduce((total, tx) => total + tx.usd, 0))}`)

    } catch (error) {
        console.log(error);
    }
}

if (process.argv.length < 3 || process.argv.length > 5) {
    console.log(`Usage: ${process.argv[0]} ${process.argv[1]} <ETH Address> [year] [month]`)
} else {
    if (process.argv.length == 5) {
        ethgettx(process.argv[2], process.argv[3], process.argv[4]);
    } else if (process.argv.length == 4) {
        ethgettx(process.argv[2], process.argv[3], -1);
    } else {
        ethgettx(process.argv[2], -1, -1);
    }
}