require('dotenv').config();

import { ethers, Contract, BigNumber, Event } from 'ethers';
import axios from 'axios';
import {
    COMP_ADDRESS,
    CCOMP_ADDRESS,
    CTOKEN_DELEGATE_ADDRESS,
    GOVERNOR_BRAVO_DELEGATOR_ADDRESS,
    GOVERNOR_BRAVO_DELEGATE_ADDRESS,
    TARGET_BLOCK,
} from './constants';
import fs from 'fs';
import parse from 'csv-parse';

const TOP_ACCRURERS_PATH = `./raw_data/top_comp_accruals_at_block_${TARGET_BLOCK}.csv`;
const OUTPUT_DATA_PATH = `./output/top_comp_accruals_with_balances_at_block_${TARGET_BLOCK}.csv`;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

async function getContractAbiFromEtherscan(contractAddress: string): Promise<string> {
    const url = `https://api.etherscan.io/api?module=contract&action=getabi&address=${contractAddress}&apikey=${ETHERSCAN_API_KEY}`;
    const response = await axios.get(url);

    return response.data.result;
}

async function readCSVAsync(filepath: string): Promise<any[]> {
    return new Promise<any[]>((resolve, reject) => {
        let csvData: any[] = [];
        fs.createReadStream(filepath)
            .pipe(parse({delimiter: ',', from: 2}))
            .on('data', function(row) {
                csvData.push(row);
            })
            .on('end', function() {
                resolve(csvData);  
            });
    });
}

function writeCSV(data: any[], filepath: string) {
    var csv = '';
    for (let i of data) {
        csv += i.join(",") + "\r\n";
    }

    fs.writeFileSync(filepath, csv);
}

async function fetchGovernorBravoVoteHistory(
    address: string,
    governorBravoContract: Contract,
    targetBlock: number,
): Promise<Event[]> {
    const filter = governorBravoContract.filters.VoteCast(address);

    return await governorBravoContract.queryFilter(filter,1,targetBlock);
}

async function fetchDelegationHistory(
    address: string,
    compContract: Contract,
    targetBlock: number,
): Promise<Event[]> {
    const filter = compContract.filters.DelegateChanged(address);

    return await compContract.queryFilter(filter,1,targetBlock);
}

async function fetchCompBalanceInfo(
    atBlock: number,
    account: string,
    compContract: Contract,
    cCompContract: Contract,
): Promise<{compBalance: string; cCompUnderlying: string}> {
    const compBalanceRaw: BigNumber = await compContract.balanceOf(account, { blockTag: atBlock});
    const compBalance = ethers.utils.formatUnits(compBalanceRaw.toString(), 18);

    const cCompUnderlyingRaw: BigNumber = await cCompContract.callStatic.balanceOfUnderlying(account, { blockTag: atBlock});
    const cCompUnderlying = ethers.utils.formatUnits(cCompUnderlyingRaw.toString(), 18);

    return {
        compBalance,
        cCompUnderlying,
    };
}

(async () => {
    const COMP_ABI = await getContractAbiFromEtherscan(COMP_ADDRESS);
    const CTOKEN_ABI = await getContractAbiFromEtherscan(CTOKEN_DELEGATE_ADDRESS);
    const GOVERNOR_BRAVO_ABI = await getContractAbiFromEtherscan(GOVERNOR_BRAVO_DELEGATE_ADDRESS);

    const provider = new ethers.providers.JsonRpcProvider(process.env.MAINNET_URL);
    const compContract = new ethers.Contract(COMP_ADDRESS, COMP_ABI, provider);
    const cCompContract = new ethers.Contract(CCOMP_ADDRESS, CTOKEN_ABI, provider);
    const governorBravoContract = new ethers.Contract(GOVERNOR_BRAVO_DELEGATOR_ADDRESS, GOVERNOR_BRAVO_ABI, provider);

    const topAccruers = await readCSVAsync(TOP_ACCRURERS_PATH);
    
    const outData = [];
    outData.push(['address','comp_accrued','comp_claimed','comp_balance','comp_in_ccomp','num_votes','num_delegations']);
    for (const accruer of topAccruers) {
        const compBalances = await fetchCompBalanceInfo(TARGET_BLOCK, accruer[0], compContract, cCompContract);
        const voteHistory = await fetchGovernorBravoVoteHistory(accruer[0], governorBravoContract, TARGET_BLOCK);
        const delegateHistory = await fetchDelegationHistory(accruer[0], compContract, TARGET_BLOCK);
        outData.push([accruer[0],accruer[1],accruer[2],compBalances.compBalance, compBalances.cCompUnderlying, voteHistory.length, delegateHistory.length]);
        console.log(`finished fetching on-chain data for ${accruer[0]}`);
    }

    writeCSV(outData, OUTPUT_DATA_PATH);
})().catch(console.log);
