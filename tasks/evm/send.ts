import bs58 from 'bs58'
import { BigNumber } from 'ethers'
import { task, types } from 'hardhat/config'
import { ActionType, HardhatRuntimeEnvironment } from 'hardhat/types'

import { makeBytes32 } from '@layerzerolabs/devtools'
import { EndpointId } from '@layerzerolabs/lz-definitions'

import { getLayerZeroScanLink } from '../solana'
import { Options } from '@layerzerolabs/lz-v2-utilities'

// add the following 3 lines anywhere before the sendParam declaration
const GAS_LIMIT = 200_000; // Gas (Compute Units in Solana) limit for the executor
const MSG_VALUE = 2_000_000; // msg.value for the lzReceive() function on destination in lamports
const _options = Options.newOptions().addExecutorLzReceiveOption(GAS_LIMIT, MSG_VALUE);

interface TaskArguments {
    dstEid: number
    amount: string
    to: string
    contractName: string
}

const action: ActionType<TaskArguments> = async (
    { dstEid, amount, to, contractName },
    hre: HardhatRuntimeEnvironment
) => {
    const signer = await hre.ethers.getNamedSigner('deployer')
    // @ts-ignore
    const token = (await hre.ethers.getContract(contractName)).connect(signer)

    // if (isSepolia(hre.network.name)) {
    //     // @ts-ignore
    //     const erc20Token = (await hre.ethers.getContractAt(IERC20, address)).connect(signer)
    //     const approvalTxResponse = await erc20Token.approve(token.address, amount)
    //     const approvalTxReceipt = await approvalTxResponse.wait()
    //     console.log(`approve: ${amount}: ${approvalTxReceipt.transactionHash}`)
    // }

    const amountLD = BigNumber.from(amount)
    const sendParam = {
        dstEid,
        to: makeBytes32(bs58.decode(to)),
        amountLD: amountLD.toString(),
        minAmountLD: amountLD.mul(9_000).div(10_000).toString(),
        extraOptions: _options.toHex(),
        composeMsg: '0x',
        oftCmd: '0x',
    }
    const [msgFee] = await token.functions.quoteSend(sendParam, false)
    const txResponse = await token.functions.send(sendParam, msgFee, signer.address, {
        value: msgFee.nativeFee,
        gasLimit: 500_000,
    })
    const txReceipt = await txResponse.wait()
    console.log(`send: ${amount} to ${to}: ${txReceipt.transactionHash}`)
    console.log(
        `Track cross-chain transfer here: ${getLayerZeroScanLink(txReceipt.transactionHash, dstEid == EndpointId.SOLANA_V2_TESTNET)}`
    )
}

task('send', 'Sends a transaction', action)
    .addParam('dstEid', 'Destination endpoint ID', undefined, types.int, false)
    .addParam('amount', 'Amount to send in wei', undefined, types.string, false)
    .addParam('to', 'Recipient address', undefined, types.string, false)
    .addOptionalParam('contractName', 'Name of the contract in deployments folder', 'MyOFT', types.string)
