This repo contains nodejs code to analyze the COMP balances of the top accruers of COMP liquidity mining rewards.

## Usage
To run the code yourself:

1. Clone the repo.
2. Install dependencies (run `yarn install`).
3. Create a `.env` file in the root directory by copying `.env.example` and populate the necessary environment variables (`MAINNET_URL` and `ETHERSCAN_API_KEY`).
4. Run `yarn build && yarn start` to run the script. The output data will appear will be written in the `output/` folder.

Note, node and yarn are prerequisites for usage of this repo.

## Input
Data on the top 100 liquidity mining accounts has been grabbed from [Dune Analytics](https://dune.xyz) and written as a CSV to the `./input` folder.

Query: https://dune.xyz/queries/231275

## Analysis
You can find some summary statistics for this data on a Google sheet [here](https://docs.google.com/spreadsheets/d/1WuazK4KYGUv2OV3IDBuyEIIVCjVcaWl1TkmoInHqWLo/edit?usp=sharing).
