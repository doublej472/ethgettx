const axios = require('axios');

// Stolen from https://stackoverflow.com/questions/11832914/how-to-round-to-at-most-2-decimal-places-if-necessary
function roundHundredths(num) {
    return Math.round((num + Number.EPSILON) * 100) / 100
}

async function ethgettx(address, year, month) {
    try {
        console.log(`Fetching transactions for ${address}...`);
        const txlistin = await axios.get(`https://api.ethermine.org/miner/${address}/payouts`);
        const txlist = txlistin.data.data;
        var outlist = []

        console.log("Processing transactions...");
        for (tx of txlist) {
            var outtx = tx;

            // YYYY-MM-DD
            var date = new Date(tx.paidOn * 1000);
            // If the year is specified, skip over anything that isn't the specified year
            if (year != -1 && date.getUTCFullYear() != year) {
                continue;
            }
            // If the month is not specified and the month doesn't match, skip
            if (month != -1 && date.getUTCMonth()+1 != month) {
                continue;
            }

            var datestr = `${date.getUTCFullYear()}-${date.getUTCMonth()+1}-${date.getUTCDate()}`
            console.log(`Getting transaction data for ${datestr}...`);

            // human readable date
            outtx.hdate = datestr;
            const usdperethin = await axios.get(`https://api.coinbase.com/v2/prices/ETH-USD/spot?date=${datestr}`)
            const usdpereth = usdperethin.data.data.amount;
            // probably inaccurate, but whatever
            // TODO Use BigNumber stuff
            const eth = outtx.amount/Math.pow(10,18);
            outtx.usd = usdpereth*eth
            outlist.push(outtx);
        }

        console.log("Done.");

        var total = 0;
        for (tx of outlist) {
            total += tx.usd;
            console.log(`${tx.hdate}:\t$${roundHundredths(tx.usd)}`)
        }
        console.log(`Total:\t$${roundHundredths(total)}`)

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
