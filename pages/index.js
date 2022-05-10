import { useState, useEffect } from 'react'
import Head from 'next/head'
import Web3 from 'web3'
import powerballContract from '../blockchain/powerball'
import styles from '../styles/Home.module.css'
import 'bulma/css/bulma.css'

const Home = () => {
  const [web3, setWeb3] = useState()
  const [address, setAddress] = useState()
  const [localContract, setLocalContract] = useState()
  const [totalPot, setTotalPot] = useState(0)
  const [lotteryHistory, setLotteryHistory] = useState([])
  const [lotteryId, setLotteryId] = useState(0)
  const [error, setError] = useState('')
  //const [myTickets, setMyTickets] = useState()

  useEffect(() => {    
    updateLotteryInfo()
  }, [localContract])

  const updateLotteryInfo = () => {
    if (localContract) {
      getLotteryId()
      getLotteryHistory()
      getTotalPot()
    }
  }

  const getLotteryId = async () => {
    try {
      const lotteryId = await localContract.methods.drawId().call()
      setLotteryId(lotteryId)
    } catch (err) {
      setError(err.message)
    }
  }
  const getTotalPot = async () => {
    try {
      const totalPot = await localContract.methods.prizePoolTotal().call()
      setTotalPot(web3.utils.fromWei(totalPot, 'ether'))
    } catch (err) {
      setError(err.message)
    }
  }

  const getLotteryHistory = async () => {
    try {
      for (let i = parseInt(lotteryId); i > 0; --i) {
        const pastDraw = await localContract.methods.pastDraws(i).call()
        console.log(pastDraw)
        setLotteryHistory(lotteryHistory => [...lotteryHistory, pastDraw])
      }
      // console.log(lotteryHistory)
    } catch (err) {
      setError(err.message)
    }
  }

  /*const getMyTickets = async () => {
    try {
      const tickets = await localContract.methods.getMyTickets().call()
      console.log('Tickets: ', tickets)
      setMyTickets(tickets)
    } catch (err) {
      console.log(err.message)
    }
  }*/

  const placeBetHandler = async () => {
    const betsToPlace = [[1,3,5,7,9,11,13,2]]
    try {
      await localContract.methods.play(betsToPlace).send({
        from: address,
        value: web3.utils.toWei('0.000001', 'ether'),
        gas: 300000,
        gasPrice: null
      })
      updateLotteryInfo()
    } catch (err) {
      setError(err.message)
    }
  }

  const connectWalletHandler = async () => {
    setError('')
    if (typeof window !== 'undefined' && typeof window.ethereum !== 'undefined') {
      try {
        await window.ethereum.request({
          method: 'eth_requestAccounts'
        })
        /* set web3 instance to the react state */
        const web3 = new Web3(window.ethereum)
        setWeb3(web3)
  
        /* get the list of accounts */
        const accounts = await web3.eth.getAccounts()
        /* set first account to react state */
        setAddress(accounts[0])

        const contract = powerballContract(web3)
        setLocalContract(contract)

        /* register the accountsChanged event */
        window.ethereum.on('accountsChanged', (accounts) => {
          setAddress(accounts[0])
          console.log("curr account: ", accounts[0])
        })
      } catch (err) {
        setError(err.message)
      }
    } else {
      alert('Please install Metamask.')
    }
  }

  const drawHandler = async () => {
    try {
      await localContract.methods.draw().send({
        from: address,
        gas: 1000000,
        gasPrice: null
      })
      // const winningTicket = await localContract.methods.winningTicket().call()
      updateLotteryInfo()
    } catch (err) {
      setError(err.message)
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
                  <button
                    className="button is-link is-large is-light mt-3"
                    onClick={placeBetHandler}>
                    Play Now
                  </button>
                </section>
                <section className="mt-6">
                  <p><b>Admin only: </b> Pick Winner</p>
                  <button className="button is-primary is-large is-light mt-3" onClick={drawHandler}>Pick Winner</button>
                </section>
                <section className="mt-6">
                  <div className="container has-text-danger">
                    <p>{error}</p>
                  </div>
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
                        <h2>Current Total Prize in Pool</h2>
                        <p>{totalPot} Ether</p>
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
