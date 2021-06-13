# ethgettx

A nodejs program that fetches and processes your payouts from [Ethermine](https://ethermine.org/)!

### Features:
 * Fetches transactions from both Ethereum and Polygon networks.
 * Fetches the historical ethereum price on the payout date from [Coinbase](https://www.coinbase.com).
 * Calculates the USD value of the payout at that specific date (useful for tracking taxable events).
 * Calculates the total ETH and (time-corrected) USD value of the payouts.
 * Supports restricting payouts to a specific date range.
 * Supports displaying any currency that Coinbase supports.

## How to use

First, download the [ZIP file](https://github.com/doublej472/ethgettx/archive/refs/heads/master.zip) for this program or use Git:
```bash
git clone https://github.com/doublej472/ethgettx.git
```

This program requires [NodeJS](https://nodejs.org/en/) and [NPM](https://www.npmjs.com/), once installed you will need to install the package dependencies with:
```bash
npm install
```

Now you can run the program with:
```
nodejs index.js <your miner address here>
```

Or if you wanted to restrict it to a certain date range:
```
nodejs index.js <your miner address here> --startdate=2021-1-1 --enddate=2021-6-12
```

Or if you want to use a different currency than USD:
```
nodejs index.js <your miner address here> --currency=GBP
```

## How this works
This works by fetching transaction data for your account from [Etherscan](https://etherscan.io/) and [Polygonscan](https://polygonscan.com/).
For each transaction, we get the price data for Ethereum on that specific date from [Coinbase](https://www.coinbase.com).

The source code should be relatively simple to understand if you have worked with async javascript,
everything is in the [index.js](https://github.com/doublej472/ethgettx/blob/master/index.js) file, and the only dependencies are Axios and Minimist.

## Something is wrong / I want to help!
Feel free to open an issue [here](https://github.com/doublej472/ethgettx/issues).
If you want to add a feature / fix a bug / clean up my bad code then open a [pull request](https://github.com/doublej472/ethgettx/pulls)!

## Like what I do?
Fuel my caffeine addiction here!

Ethereum address: 0x21aDD3C1B18B5877D625beD418A77B9e1b89E7a9

Matic / Polygon address: 0x21aDD3C1B18B5877D625beD418A77B9e1b89E7a9
