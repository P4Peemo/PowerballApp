import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import Web3 from 'web3'
import powerballContract from '../blockchain/powerball'
import * as bulmaToast from 'bulma-toast'
import moment from 'moment'

import 'animate.css'
import '@fortawesome/fontawesome-free/css/all.min.css'
import styles from '../styles/Home.module.scss'

import Collapsible from '../components/collapsible'
import TicketInfo from '../components/ticket-info'

bulmaToast.setDefaults({
  duration: 2000,
  position: 'top-center',
  pauseOnHover: true,
  closeOnClick: true,
  animate: { in: 'fadeIn', out: 'fadeOut' },
})

const Home = () => {
  // function required to be used for state initialisation.
  const initialiseTickets = (num) => {
    let tickets = []
    const defaultTicket = () => {
      return {
          balls: new Array(7).fill(0),
          powerball: 0
      }
    }

    [...Array(num).keys()].forEach(i => {
      tickets.push(defaultTicket())
    })

    return tickets
  }

  // web3 objects
  const [web3, setWeb3] = useState()
  const [localContract, setLocalContract] = useState()

  // values that are fetched once and never change
  const [contractOwner, setContractOwner] = useState()
  const [ticketPrice, setTicketPrice] = useState(0) // stored in Wei

  // values that need to be updated when address changes (including the values below for refetching)
  const [address, setAddress] = useState()
  const [isOwner, setIsOwner] = useState(false)

  // values that need refetching each time some variable changes
  const [lotteryId, setLotteryId] = useState(0)
  const [totalPot, setTotalPot] = useState(0) //stored in Ether
  const [numOfTicketsInPool, setNumOfTicketsInPool] = useState(0)
  const [lotteryHistory, setLotteryHistory] = useState([])
  const [myTicketsInPool, setMyTicketsInPool] = useState()

  // ticket selection process
  const [numOfTickets, setNumOfTickets] = useState(4)
  const [ticketsToPlace, setTicketsToPlace] = useState(initialiseTickets(numOfTickets))

  // loading indicators
  const [isLoadingContractInfo, SetIsLoadingContractInfo] = useState(false)
  const [isLoadingLotteryInfo, SetIsLoadingLotteryInfo] = useState(false)
  const didMount = useRef(false)

  // Check if wallet is connected upon loading (once only)
  useEffect(() => {    
    checkIfWalletIsConnected()
  }, [])

  useEffect(() => {
    if (localContract) {
      updateContractInfo()
    }
  }, [localContract])

  // Check contract info whenever the localContract is created
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true
      return
    }
  
    if (localContract) {
      updateLotteryInfo()
    }
  }, [address])

  const updateContractInfo = async () => {
    SetIsLoadingContractInfo(true)

    try {
      const contractOwner = (await localContract.methods.manager().call()).toLowerCase()
      const ticketPrice = await localContract.methods.ticketPrice().call()

      setContractOwner(contractOwner)
      setIsOwner(address == contractOwner)
      setTicketPrice(parseInt(ticketPrice))
    } catch (err) {
      bulmaToast.toast({message: err.message, type: 'is-danger'})
    } finally {
      SetIsLoadingContractInfo(false)
    }
  }

  const updateLotteryInfo = async () => {
    SetIsLoadingLotteryInfo(true)
    try {
      const drawId = parseInt(await localContract.methods.drawId().call())
      const totalPot = await localContract.methods.prizePoolTotal().call()
      const numOfTicketsInPool = await localContract.methods.counter().call()

      //fetch lottery history
      let lotteryHistory = []
      for (let i = drawId - 1; i >= 0; --i) {
        const pastDraw = await localContract.methods.pastDraws(i).call()
        const balls = [...Array(7).keys()].map(i => pastDraw.winningTicket[i])
        const winningTicket = {
          balls,
          powerball: pastDraw.winningTicket[7]
        }
        const sanitisedPastDraw = {
          drawId: parseInt(pastDraw.drawId),
          drawTime: moment(pastDraw.drawTime * 1000).format('MMMM Do YYYY, hh:mm:ss a'),
          winningTicket
        }
        lotteryHistory.push(sanitisedPastDraw)
      }

      // fetch my tickets in pool
      const ticketsString = await localContract.methods.getMyTickets().call({
        from: address
      })

      let tickets = []
      let rawTicket = []

      for (let i = 0; i < ticketsString.length;) {
        let ticketEnd = i
        while (ticketsString[ticketEnd] !==']' && ticketEnd < ticketsString.length) {
          ++ticketEnd
        }
        rawTicket = JSON.parse(ticketsString.slice(i, ticketEnd + 1))
        const formattedTicket = {
          balls: rawTicket.slice(0, 7),
          powerball: rawTicket[7]
        }
        tickets.push(formattedTicket)
        i = ticketEnd + 1
      }
      
      // update states finally
      setLotteryId(drawId)
      setTotalPot(web3.utils.fromWei(totalPot, 'ether'))
      setNumOfTicketsInPool(numOfTicketsInPool)
      setLotteryHistory(lotteryHistory)
      setMyTicketsInPool(tickets)
    } catch (err) {
      bulmaToast.toast({message: err.message, type: 'is-danger'})
    } finally {
      SetIsLoadingLotteryInfo(false)
    }
  }

  const withdrawHandler = async () => {
    if (!address) {
      bulmaToast.toast({
        message: 'Please connect your wallet first',
        type: 'is-warning'
      })
    }

    try {
      const amount = await localContract.methods.withdraw().send({
        from: address,
        gas: 3000000
      })

      bulmaToast.toast({
        message: `Successfully withdrew ${web3.utils.fromWei(amount, 'ether')} ether.`,
        type: 'is-success'
      })
    } catch (err) {
      bulmaToast.toast({
        message: err.message,
        type: 'is-danger'
      })
    }
  }

  const placeBetHandler = async () => {
    if (!address) {
      bulmaToast.toast({
        message: 'Please connect your wallet first',
        type: 'is-warning'
      })
    }
  
    // format tickets to be submitted
    let sanitisedTickets = []
    ticketsToPlace.forEach(ticket => {
      ticket.balls = ticket.balls.sort((a, b) => a - b)
      sanitisedTickets.push([
        ...ticket.balls,
        ticket.powerball
      ])
    })

    // check tickets for completeness
    let isTicketsFilled = true
    sanitisedTickets.forEach((ticket, i) => {
      if (ticket.includes(0)) {
        bulmaToast.toast({
          message: `ticket-${i + 1} contains unselected number(s).`,
          type: 'is-warning'
        })
        isTicketsFilled = false
      }
    })

    if (!isTicketsFilled) return
  
    try {
      await localContract.methods.play([...sanitisedTickets]).send({
        from: address,
        value: numOfTickets * ticketPrice,
        gas: 3000000
      })
      bulmaToast.toast({
        message: `Successfully placed ${numOfTickets} tickets.`,
        type: 'is-success'
      })
      updateLotteryInfo()
    } catch (err) {
      bulmaToast.toast({message: err.message, type: 'is-danger'})
    }
  }

  const checkIfWalletIsConnected = async () => {
    if (typeof window !== 'undefined' && typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({
          method: 'eth_accounts'
        })

        // set web3 instance to the react state
        const web3 = new Web3(window.ethereum)
        setWeb3(web3)

        // create local copy of the contract
        const contract = powerballContract(web3)
        setLocalContract(contract)

        if (accounts.length != 0) {
          setAddress(accounts[0])
          // updateLotteryInfo()
        } else {
          bulmaToast.toast({message: 'No authorised account is found', type: 'is-warning'})
        }

        // register the accountsChanged event
        window.ethereum.on('accountsChanged', (accounts) => {
          
          if (accounts.length == 0) {
            setAddress(null)
            setIsOwner(false)
          } else {
            setAddress(accounts[0])
            setIsOwner(accounts[0] == contractOwner)
          }
        })
      } catch (err) {
        bulmaToast.toast({message: err.message, type: 'is-danger'})
      }
    }
    // we only warn the user when they try to connect the wallet
  }

  const connectWalletHandler = async () => {
    if (typeof window !== 'undefined' && typeof window.ethereum !== 'undefined') {
      try {
        await window.ethereum.request({
          method: 'eth_requestAccounts'
        })
  
        // get the list of accounts
        const accounts = await web3.eth.getAccounts()
        // set first account to react state
        setAddress(accounts[0])
      } catch (err) {
        bulmaToast.toast({message: err.message, type: 'is-danger'})
      }
    } else {
      bulmaToast.toast({message: 'Please install Metamask.', type: 'is-danger'})
    }
  }

  const drawHandler = async () => {
    // TODO schedule draw process rather than manually drawing
    if (!address) {
      bulmaToast.toast({
        message: 'Please connect your wallet first',
        type: 'is-warning'
      })
    }

    try {
      await localContract.methods.draw().send({
        from: address,
        gas: 3000000,
        gasPrice: null
      })

      bulmaToast.toast({
        message: `Winning ticket for round ${lotteryId + 1} has been announced.`,
        type: 'is-success'
      })

      updateLotteryInfo()
    } catch (err) {
      bulmaToast.toast({message: `Open draw failed with: ${err.message}`, type: 'is-danger'})
    }
  }

  const changeNumOfTicketsHandler = e => {
    const updatedNum = parseInt(e.target.value)
    let updatedTickets = []
    if (updatedNum > numOfTickets) {
      updatedTickets = [...ticketsToPlace, ...initialiseTickets(updatedNum - numOfTickets)]
    }  else {
      updatedTickets = ticketsToPlace.slice(0, updatedNum)
    }

    setNumOfTickets(parseInt(e.target.value))
    setTicketsToPlace(updatedTickets)
  }

  const updateTickets = (updatedTickets) => {
    setTicketsToPlace(updatedTickets)
  }

  return (
    <div>
      <Head>
        <title>Ethereum Powerball</title>
        <meta name="description" content="An Ethereum powerball dApp" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <nav className="navbar m-4">
          <div className="navbar-brand">
            <div className="navbar-item is-vcentered">
              <img src="/logo.jpg" />
            </div>
            <div className={`navbar-item ${styles.brand}`}>
              <h1>Ethereum Powerball</h1>
              <span>Still Powerball, but the more decentralised way.</span>
            </div>
          </div>
          <div className="navbar-end">
            {address
              ?
              (<div className="navbar-item icon-text">
                <span className="icon has-text-success">
                  <i className="fas fa-check-square"></i>
                </span>
                <span className="has-tooltip-arrow has-tooltip-left has-tooltip-primary"
                  data-tooltip={address}>Wallet is connected</span>
              </div>)
              :
              (<div className="navbar-item">
                <button
                  className="button is-primary"
                  onClick={connectWalletHandler}>
                  Connect Wallet
                </button>
              </div>)
            }
          </div>
        </nav>
        <div className="container" style={{ 'margin': '0 auto 1em', 'display': 'flex', 'fontSize': 'small', 'justifyContent': 'space-between' }}>
          <span>
            <i className="fa-solid fa-circle-info" style={{ 'paddingRight': '5px' }}/>
            All the rules (Prize ratio, Winning Criteria, etc.) for
            Ethereum Powerball follow the&nbsp;
            <a style={{ 'textDecoration': 'underline' }} href="https://www.thelott.com/powerball/how-to-play" target="_blank">
              rules of Aussie Powerball.
            </a>
          </span>
          <span>Contract Owner: {contractOwner}</span>
        </div>
        <div className="container">
          <div className="columns" style={{ 'textAlign': 'center' }}>
            <div className="column is-half">
              <article className="message is-info is-large is-dark">
                <div className="message-header" style={{ 'display': 'block' }}>
                  <p>Total prize currently in the pool (Round {lotteryId + 1}):</p>
                </div>
                <div className="message-body">
                  <strong>{totalPot} Ether</strong>
                </div>
              </article>
            </div><div className="column is-half">
              <article className="message is-primary is-large">
                <div className="message-header" style={{ 'display': 'block' }}>
                  <p>Number of tickets in pool:</p>
                </div>
                <div className="message-body">
                  <strong>{numOfTicketsInPool}</strong>
                </div>
              </article>
            </div>
          </div>
        </div>
        <hr />
        <div className="container">
          <section className="mt-5 ">
            <div className="columns">
              <div className="column is-two-thirds">
                <div className="container " style={{ 'padding': '10px' }}>
                  <section className="form">
                    <div className="field">
                      <div className={styles.formLabel}>Select number of games</div>
                      <div className="control">
                        <div className="select is-rounded" style={ { 'marginLeft': '30px' }}>
                          <select onChange={changeNumOfTicketsHandler}>
                            <option value="4">4 Games - {4 * ticketPrice} Wei</option>
                            <option value="5">5 Games - {5 * ticketPrice} Wei</option>
                            <option value="6">6 Games - {6 * ticketPrice} Wei</option>
                            <option value="7">7 Games - {7 * ticketPrice} Wei</option>
                            <option value="8">8 Games - {8 * ticketPrice} Wei</option>
                            <option value="9">9 Games - {9 * ticketPrice} Wei</option>
                            <option value="10">10 Games - {10 * ticketPrice} Wei</option>
                          </select>
                        </div>
                        <div className={styles.iconContainer}>
                          <span data-tooltip="1 Ether converts to 1e18 Wei"><i className="fa-solid fa-circle-info"></i></span>
                        </div>
                      </div>
                    </div>
                    <hr />
                    <div className="field">
                      <div className={styles.formLabel}>Select ticket entries</div>
                      <Collapsible numOfTickets={numOfTickets} ticketsToPlace={ticketsToPlace}
                        updateTickets={updateTickets} />
                    </div>
                  </section>
                </div>
                <section className="mt-5" style={{ 'textAlign': 'right' }}>
                  <button
                    className="button is-info is-light is-medium mt-3"
                    onClick={placeBetHandler}>
                    Play Now
                  </button>
                </section>
                <section className="mt-5" style={{ 'textAlign': 'right' }}>
                  <button
                    className="button is-link is-light is-medium mt-3"
                    onClick={withdrawHandler}>
                    Withdraw my rewards
                  </button>
                </section>
                {isOwner && 
                  (<section className="mt-6" style={{ 'textAlign': 'right' }}>
                    <p><b>Admin only: </b> Pick Winner</p>
                    <button className="button is-danger is-light is-medium mt-3" onClick={drawHandler}>Pick Winner</button>
                  </section>)
                }
              </div>
              <div className={`${styles.lotteryInfo} column is-one-third`}>
                <section>
                  <div className="card">
                    <div className="card-content" style={{ 'padding': '1em' }}>
                      <div className="content">
                        <h3>Lottery History</h3>
                        <hr />
                        {
                          lotteryHistory.map((round, i) => (
                            <div className={styles.ticketEntry} key={`round-${i}`}>
                              <div className={styles.ticketEntryHeader}>
                                <span>Lottery #{round.drawId + 1}</span>
                                <span>{round.drawTime}</span>
                              </div>
                                <TicketInfo ticket={round.winningTicket} />
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  </div>
                </section>
                <section className="mt-5">
                  <div className="card">
                    <div className="card-content" style={{ 'padding': '1em' }}>
                      <div className="content">
                        <h3>My Tickets (Round {lotteryId + 1})</h3>
                        <hr />
                        {myTicketsInPool && (
                          <div className="ticket-entries">
                            {
                              myTicketsInPool.map((ticket, i) => (
                                <div className={styles.ticketEntry} key={`round-${i}`}>
                                  <TicketInfo ticket={ticket} />
                                </div>
                              ))
                            }
                          </div>)
                        }
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

{/* <div className="navbar-start">
            <div className={`navbar-item ${styles.owner}`}>
              <p>Contract Owner: {contractOwner}</p>
            </div>
          </div> */}
