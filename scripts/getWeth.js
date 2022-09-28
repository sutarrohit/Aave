const { getNamedAccounts, ethers } = require("hardhat")

const AMOUNT = ethers.utils.parseEther("0.02")

async function getWeth() {
    const { deployer } = await getNamedAccounts()

    //Call the deposite function on the weth contract using abi & contract adddress or (use interface)
    // Contract address of the Weth = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2

    const iWeth = await ethers.getContractAt(
        "IWeth",
        "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        deployer
    )

    // Deposite ETH in Weth contract to get Weth
    const tx = await iWeth.deposit({ value: AMOUNT })
    await tx.wait()

    const wethBalance = await iWeth.balanceOf(deployer)
    console.log(` Get Weth  ${wethBalance.toString()} Toekn`)
}

module.exports = { getWeth, AMOUNT }
