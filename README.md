This is a Web3 Project implemented for [Ethereum Powerball](https://github.com/P4Peemo/Powerball) with nextjs.

## Getting Started

First, install the necessary dependencies:

```bash
npm i
```

Second, run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.


You need to install Metamask extension for your website to function properly. Refer to the Metamask [installation instructions](https://metamask.io/download/) for more details.


You will need to connect your wallet before preceeding to bet, withdraw pot, or pick a winner (if you are the contract owner).

## Configuration after deployment

After deploying following the steps from [here](https://github.com/p4peemo/Powerball#deployment-on-testnet-rinkeby), we can copy and replace our `Powerball.sol` from [Ethereum Powerball](https://github.com/p4peemo/Powerball) into `blockchain/contracts/Powerball.sol` and run:

```bash
npm run compile
```

Under `blockchain/build` folder, an abi file for our contract will be generated. Copy and paste its content into `blockchain/powerball.js`. Meanwhile, in `blockchain/powerball.js`, paste the `contract address` we previously saved when creating our contract here.

Now restart the server and it should run. Enjoy.