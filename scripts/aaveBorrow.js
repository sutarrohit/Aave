const { getWeth, AMOUNT } = require("../scripts/getWeth")
const { getNamedAccounts, ethers } = require("hardhat")
const { deployContract } = require("ethereum-waffle")

async function main() {
    await getWeth()
    const { deployer } = await getNamedAccounts()

    /**
     * @dev Aave LenddingPoolAddressProvide contract provides address of the lending pool contract
     * We have to call LenddingPoolAddressProvide contract to get LendingPool contract address  USING ABI & CONTRACT ADDRESS
     * LendingPoolAddressesProvider :- 0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5
     */

    /* Get lending pool address */
    const lendingPool = await getLendingPool(deployer)
    console.log("Lending pool address", lendingPool.address)

    /** Deposit*/
    const wethTokenAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
    /**approve */
    await approveERC20(wethTokenAddress, lendingPool.address, AMOUNT.toString(), deployer)
    console.log("Depositing Tokens.......")
    await lendingPool.deposit(wethTokenAddress, AMOUNT, deployer, 0)
    console.log("Token Deposited.......")

    /*Get user account data */
    let { totalDebtETH, availableBorrowsETH } = await getUserData(lendingPool, deployer)

    /**
     * Borrow Time
     * We can borrow token over the collatral we have deposited
     * we need the current DAI price, so we can borrow DAI token  (Using chainlink priceFeed)
     */
    const daiPrice = await getDAIPrice()
    //Formula to convert ETH to DAI
    const amountDaiToBorrow = availableBorrowsETH.toString() * 0.95 * (1 / daiPrice.toNumber())
    console.log(`amountDaiToBorrow ${amountDaiToBorrow}DAI `)
    const amountDaiToBorrowWei = ethers.utils.parseEther(amountDaiToBorrow.toString())

    daiTokenAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
    //Call borrow function
    await borrowDai(daiTokenAddress, lendingPool, amountDaiToBorrowWei, deployer)
    await getUserData(lendingPool, deployer)

    /**Loan repay function */
    await repay(daiTokenAddress, amountDaiToBorrowWei, deployer, lendingPool)
    await getUserData(lendingPool, deployer)
}

/**
 * @dev  This function get Lending pool address to deposit Weth
 * @dev  lendingPoolAddressProvider contract provide addres of the lending pool address
 * @param {*} account account address of the owner
 * @returns lending pool object to call lending pool's functions
 */
async function getLendingPool(account) {
    const lendingPoolAddressProvider = await ethers.getContractAt(
        "ILendingPoolAddressesProvider",
        "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5",
        account
    )
    const lendingPoolAddress = await lendingPoolAddressProvider.getLendingPool()
    console.log(`contract ${lendingPoolAddress}`)
    //Call lending pool contract
    const lendingPool = await ethers.getContractAt("ILendingPool", lendingPoolAddress, account)
    return lendingPool
}

/**
 * @dev approveERC20 call weth contract, aave can pull weth token from owner address
 * @param {*} erc20contracAddress contract address of the weth contract
 * @param {*} spenderAddress address of the aave lending pool
 * @param {*} amountTOSpend number of token aave can access
 * @param {*} account account number of the owner
 */
async function approveERC20(erc20contracAddress, spenderAddress, amountTOSpend, account) {
    //Connect to ERC20 Weth token
    const erc20Token = await ethers.getContractAt("IERC20", erc20contracAddress, account)
    //Approve Weth ERC20 token
    const tx = await erc20Token.approve(spenderAddress, amountTOSpend)
    await tx.wait(1)
}

/**
 * @dev get DAI token current price using chainlink priceFeed
 * @dev DAI to ETH chainlink contract address : 0x773616E4d11A78F511299002da57A0a94577F1f4
 */

async function getDAIPrice() {
    const daiEthPriceFeed = await ethers.getContractAt(
        "AggregatorV3Interface",
        "0x773616E4d11A78F511299002da57A0a94577F1f4"
    )
    const price = (await daiEthPriceFeed.latestRoundData())[1]
    console.log("Current DAI price is ", price.toString())
    return price
}

/**
 * @def return user account data
 * @param address of the user
 * @param lendingPool lending pool's object
 * @return totalCollateralETH, totalDebtETH, availableBorrowsETH,currentLiquidationThreshold,
 * @return ltv the loan to value of the user, healthFactor
 **/
async function getUserData(lendingPool, account) {
    const { totalCollateralETH, totalDebtETH, availableBorrowsETH } =
        await lendingPool.getUserAccountData(account)
    console.log(` You have ${totalCollateralETH} worth ETH deposited`)
    console.log(` You have ${totalDebtETH} worth ETH borrow`)
    console.log(` You can borrow ${availableBorrowsETH} worth of ETH `)
    return { totalDebtETH, availableBorrowsETH }
}

/**
 *@dev this function borrow DAI token from lending pool
 */

async function borrowDai(daiAddress, lendingPool, amountDaiToBorrowWei, account) {
    const brrowTx = await lendingPool.borrow(daiAddress, amountDaiToBorrowWei, 1, 0, account)
    await brrowTx.wait(1)
    console.log(`You have borrowed DAI`)
}

/**
 * @dev this function repay borrowed loan to the lending pool
 */
async function repay(daiTokenAddress, amountDaiToBorrowWei, account, lendingPool) {
    await approveERC20(daiTokenAddress, lendingPool.address, amountDaiToBorrowWei, account)
    const tx = await lendingPool.repay(daiTokenAddress, amountDaiToBorrowWei, 1, account)
    await tx.wait(1)
    console.log(`${tx.toString()} amount of DAI repaid`)
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
