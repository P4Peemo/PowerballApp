import Head from 'next/head'
import { useState } from 'react'
import Web3 from 'web3'
import 'bulma/css/bulma.css'
import styles from '../styles/Powerball.module.css'

const Powerball = () => {
    const [error, setError] = useState('')
    let web3
    const connectWalletHandler = async () => {
        if (typeof window !== "undefined" && typeof window.ethereum !== "undefined") {
            try {
                await window.ethereum.request({ method: "eth_requestAccounts" })
                web3 = new Web3(window.ethereum)
            } catch (err) {
                setError(err.message)
            }
        } else {
            console.log("Please install Metamask.")
        }
    }
    return (
        <div className={styles.main}>
            <Head>
                <title>Powerball App</title>
                <meta name="description" content="A blockchain Powerball app" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <nav className="navbar mt-4 mb-4">
                <div className="container">
                    <div className="navbar-brand">
                        <h1>Powerball App</h1>
                    </div>
                    <div className="navbar-end">
                        <button className="button is-primary" onClick={connectWalletHandler}>
                            Connect Wallet
                        </button>
                    </div>
                </div>
            </nav>
            <section>
                <div className="container has-text-danger">
                    <p>{error}</p>
                </div>
            </section>
        </div>
    )
}

export default Powerball