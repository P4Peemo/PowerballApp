import { useState } from 'react'
import Head from 'next/head'
import Web3 from 'web3'
import styles from '../styles/Home.module.css'
import 'bulma/css/bulma.css'

const Home = () => {
  const [web3, setWeb3] = useState()
  const [address, setAddress] = useState()

  const checkIfWalletIsConnected = async () => {
    try {
      const { ethereum } = window

      if (!ethereum) {
        console.log("Make sure you have Metamask installed.")
      } else {
        console.log("We have the Ethereum object.")
      }

      const accounts = await ethereum.request({
        method: "eth_accounts"
      })

      if (accounts.length != 0) {
        const account = accounts[0]
        console.log("Found an authorised account: ", account)
      } else {
        console.log("No authorised account found")
      }
    } catch (err) {
      console.log(err.message)
    }
  }

  const connectWalletHandler = async () => {
    if (typeof window !== "undefined" && typeof window.ethereum !== "undefined") {
      try {
        await ethereum.request({
          method: "eth_requestAccounts"
        })
  
        const web3 = new Web3(window.ethereum)
        /* set web3 instance to the react state */
        setWeb3(web3)
  
        /* get the list of accounts */
        const accounts = web3.eth.getAccounts()

        /* set first account to react state */
        setAddress(accounts[0])
      } catch (err) {
        console.log(err.message)
      }
    } else {
      alert("Please install Metamask.")
    }
  }

  return (
    <div>
      <Head>
        <title>Ethereum Powerball</title>
        <meta name="description" content="An Ethereum powerball dApp" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <nav className="navbar mt-4 mb-4">
          <div className="container">
            <div className="navbar-brand">
              <h1>Ether Powerball</h1>
            </div>
            <div className="navbar-end">
              <button className="button is-link" onClick={connectWalletHandler}>Connect Wallet</button>
            </div>
          </div>
        </nav>
        <div className="container">
          <section className="mt-5 ">
            <div className="columns">
              <div className="column is-two-thirds">
                <section className="mt-5">
                  <p>Enter the lottery by sending 0.01 Ether</p>
                  <button className="button is-link is-large is-light mt-3">Play Now</button>
                </section>
                <section className="mt-6">
                  <p><b>Admin only: </b> Pick Winner</p>
                  <button className="button is-primary is-large is-light mt-3">Pick Winner</button>
                </section>
              </div>
              <div className={`${styles.lotteryinfo} column is-one-third`}>
                <section className="mt-5">
                  <div className="card">
                    <div className="card-content">
                      <div className="content">
                        <h2>Lottery History</h2>
                        <div className="history-entry">
                          <div>Lottery #1 winner: </div>
                          <div><a>placeholder address</a></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
                <section className="mt-5">
                  <div className="card">
                    <div className="card-content">
                      <div className="content">
                        <h2>Players (1)</h2>
                        <div className="history-entry">
                          <div>Lottery #1 winner: </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
                <section className="mt-5">
                  <div className="card">
                    <div className="card-content">
                      <div className="content">
                        <h2>Pot</h2>
                        <p>10 Ether</p>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </section>
        </div>

      </main>

      <footer className={styles.footer}>
        <p>&copy; 2022 P4Peemo</p>
      </footer>
    </div>
  )
}

export default Home
