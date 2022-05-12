import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import Web3 from 'web3'
import powerballContract from '../blockchain/powerball'
import styles from '../styles/Home.module.css'
import 'bulma/css/bulma.css'

const Home = () => {
  // function required to be used for state initialisation.
  const initialiseTickets = () => {
    let tickets = []
    const defaultTicket = () => {
      return {
        balls: new Array(7).fill(0),
        powerball: 0
      }
    }
  
    [...Array(numOfTickets).keys()].forEach(i => {
      tickets.push(defaultTicket())
    })
    return tickets
  }

  const [web3, setWeb3] = useState()
  const [address, setAddress] = useState()
  const [localContract, setLocalContract] = useState()

  const [contractOwner, setContractOwner] = useState()
  const [ticketPrice, setTicketPrice] = useState(0) // stored in terms of ether
  const [totalPot, setTotalPot] = useState(0)
  const [lotteryHistory, setLotteryHistory] = useState([])
  const [lotteryId, setLotteryId] = useState(0)
  const [error, setError] = useState('')

  const [isOwner, setIsOwner] = useState(false)
  const [myTicketsInPool, setMyTicketsInPool] = useState()

  // current round of draw related
  const [numOfTickets, setNumOfTickets] = useState(4)
  const [ticketsToPlace, setTicketsToPlace] = useState(initialiseTickets())

  const didMount = useRef(false)
  // Check if wallet is connect upon loading (once only)
  useEffect(() => {    
    checkIfWalletIsConnected()
  }, [])

  // Check contract info whenever the localContract is created
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true
      return
    }
    if (localContract) {
      updateContractInfo()
      updateLotteryInfo()
    }
  }, [localContract])

  useEffect(() => {
    if (localContract && address) {
      getMyTickets()
    }
  }, [address])

  const updateContractInfo = async () => {
    const contractOwner = (await localContract.methods.manager().call()).toLowerCase()
    const ticketPrice = await localContract.methods.ticketPrice().call()
    setContractOwner(contractOwner)
    setIsOwner(address == contractOwner)
    setTicketPrice(parseInt(ticketPrice))
    // setTicketPrice(parseFloat(web3.utils.fromWei(`${ticketPrice}`, 'ether')))
  }

  const updateLotteryInfo = async () => {
    if (localContract) {
      try {
        const drawId = await localContract.methods.drawId().call()
        const totalPot = await localContract.methods.prizePoolTotal().call()

        let lotteryHistory = []
        for (let i = parseInt(drawId - 1); i >= 0; --i) {
          const pastDraw = await localContract.methods.pastDraws(i).call()
          const balls = [...Array(7).keys()].map(i => pastDraw.winningTicket[i])
          const winningTicket = {
            balls,
            powerball: pastDraw.winningTicket[7]
          }
          const sanitisedPastDraw = {
            drawId: pastDraw.drawId,
            drawTime: pastDraw.drawTime,
            winningTicket
          }
          lotteryHistory.push(sanitisedPastDraw)
        }
        
        setLotteryHistory(lotteryHistory)
        setLotteryId(drawId)
        setTotalPot(web3.utils.fromWei(totalPot, 'ether'))
      } catch (err) {
        setError(err)
      }
    }
  }

  const getMyTickets = async () => {
    try {
      const ticketsString = await localContract.methods.getMyTickets().call({
        from: address
      })

      let tickets = []
      let rawTicket = []
      
      console.log(ticketsString, ticketsString.length)
      for (let i = 0; i < ticketsString.length;) {
        let ticketEnd = i
        while (ticketsString[ticketEnd] !==']' && ticketEnd < ticketsString.length) {
          ++ticketEnd
        }
        console.log(i, ticketEnd)
        console.log(ticketsString.slice(i, ticketEnd + 1))
        rawTicket = JSON.parse(ticketsString.slice(i, ticketEnd + 1))
        console.log('raw ticket: ', rawTicket)
        const formattedTicket = {
          balls: rawTicket.slice(0, 7),
          powerball: rawTicket[7]
        }
        console.log('formatted ticket: ', formattedTicket)
        tickets.push(formattedTicket)
        i = ticketEnd + 1
      }
      setMyTicketsInPool(tickets)
    } catch (err) {
      setError(err)
    }
  }

  const withdrawHandler = async () => {
    try {
      const amount = await localContract.methods.withdraw().call({
        from: address
      })

      // TODO set success message
      console.log(amount)
    } catch (err) {
      setError(err)
    }
  }

  const placeBetHandler = async () => {
    // TODO verify valid tickets before submitting
    const sanitisedTickets = ticketsToPlace.map(ticket => {
      ticket.balls = ticket.balls.sort((a, b) => a - b)
      return [
        ...ticket.balls,
        ticket.powerball
      ]
    })
    try {
      await localContract.methods.play(sanitisedTickets).send({
        from: address,
        value: numOfTickets * ticketPrice,
        // value: web3.utils.toWei(`${numOfTickets * ticketPrice}`, 'ether'),
        // gas: 1000000,
        gasPrice: null
      })
      
      getMyTickets()
      updateLotteryInfo()
    } catch (err) {
      setError(err)
    }
  }

  const checkIfWalletIsConnected = async () => {
    if (typeof window !== 'undefined' && typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({
          method: 'eth_accounts'
        })

        /* set web3 instance to the react state */
        const web3 = new Web3(window.ethereum)
        setWeb3(web3)
        
        /* create local copy of the contract */
        const contract = powerballContract(web3)
        setLocalContract(contract)

        if (accounts.length != 0) {
          setAddress(accounts[0])
          updateLotteryInfo()
        } else {
          console.log('No authorised account found')
        }

        /* register the accountsChanged event */
        window.ethereum.on('accountsChanged', (accounts) => {
          setAddress(accounts[0])
          setIsOwner(accounts[0] == contractOwner)
        })
      } catch (err) {
        setError(err)
      }
    } else {
      // we only warn the user when they try to connect the wallet
    }
  }

  const connectWalletHandler = async () => {
    if (typeof window !== 'undefined' && typeof window.ethereum !== 'undefined') {
      try {
        await window.ethereum.request({
          method: 'eth_requestAccounts'
        })
  
        /* get the list of accounts */
        const accounts = await web3.eth.getAccounts()
        /* set first account to react state */
        setAddress(accounts[0])
      } catch (err) {
        setError(err)
      }
    } else {
      alert('Please install Metamask.')
    }
  }

  const drawHandler = async () => {
    // TODO schedule draw process rather than manually drawing
    try {
      await localContract.methods.draw().send({
        from: address,
        gasPrice: null
      })

      updateLotteryInfo()
    } catch (err) {
      setError(err)
    }
  }

  const changeNumOfTicketsHandler = e => {
    setNumOfTickets(parseInt(e.target.value))
  }

  const selectNumberHandler = (e, ticketId, isPbRow) => {
    let ticket = ticketsToPlace[ticketId]
    const selectNumber = (value, ticket, isPbRow) => {
      if (isPbRow) {
        ticket.powerball = value
      } else {
        let balls = ticket.balls
        balls[balls.findIndex(ball => ball == 0)] = value
      }

      return ticket
    }
  
    const unselectNumber = (value, ticket, isPbRow) => {
      if (isPbRow) {
        ticket.powerball = 0
      } else {
        let balls = ticket.balls
        balls[balls.findIndex(ball => ball == value)] = 0
      }
      return ticket
    }

    const isChecked = e.target.checked
    const targetValue = parseInt(e.target.value)
    if (isChecked) {
      ticket = selectNumber(targetValue, ticket, isPbRow)
    } else {
      ticket = unselectNumber(targetValue, ticket, isPbRow)
    }

    let modifiedTickets = ticketsToPlace.slice(0, ticketId)
    modifiedTickets.push(ticket)
    modifiedTickets = modifiedTickets.concat(ticketsToPlace.slice(ticketId+1, numOfTickets))
    setTicketsToPlace(modifiedTickets)
  }

  const checkDisabled = (ticketId, value, isPbRow) => {
    const ticket = ticketsToPlace[ticketId]
    if (isPbRow) {
      return ticket.powerball != value &&
      ticket.powerball != 0
    } else {
      return !ticket.balls.includes(value) &&
      (ticket.balls.findIndex(elem => elem == 0) == -1)
    }
  }

  const ticketInfoHTML = (ticket) => {
    console.log(myTicketsInPool)
    return (
      <div className={styles.gameRowCells}>
        {
          [...Array(7).keys()].map(i => (
            <div className={styles.gameRowCell} key={`cell-${i+1}`}>{ticket.balls[i] == 0 ? '-' : ticket.balls[i]}</div>
          ))
        }
        <div className={styles.powerballCell}>{ticket.powerball == 0 ? '-' : ticket.powerball}</div>
      </div>
    )    
  }

  const numberTableRowHTML = (idArray, ticketId, isPbRow) => (
    <tr>
      {
        idArray.map(i => (
          <td key={`ticket-${ticketId}${isPbRow ? '-pb' : ''}-${i}`}>
            <input type="checkbox" id={`ticket-${ticketId}${isPbRow ? '-pb' : ''}-${i}`}
              value={`${i}`} onChange={e => selectNumberHandler(e, ticketId, isPbRow)}
              disabled={checkDisabled(ticketId, i, isPbRow)}/>
            <label htmlFor={`ticket-${ticketId}${isPbRow ? '-pb' : ''}-${i}`}>{i}</label>
          </td>
        ))
      }
    </tr>
  )

  const selectNumbersHTML = _ => (
    [...Array(numOfTickets).keys()].map(ticketId => {
      return (
        <div className="gameRowContainer" key={`Ticket ${ticketId + 1}`}>
          <span>Ticket {ticketId + 1}</span>
          {ticketInfoHTML(ticketsToPlace[ticketId])}
          <div className="numberPicker">
            <table className="table">
              <tbody>
                { numberTableRowHTML(Array.from({length: 10},(v,k)=>k+1), ticketId, false) }
                { numberTableRowHTML(Array.from({length: 10},(v,k)=>k+11), ticketId, false) }
                { numberTableRowHTML(Array.from({length: 10},(v,k)=>k+21), ticketId, false) }
                { numberTableRowHTML(Array.from({length: 5},(v,k)=>k+31), ticketId, false) }
                <tr className="sectionRow">
                  <td colSpan="10">Select Powerball</td>
                </tr>
                { numberTableRowHTML(Array.from({length: 10},(v,k)=>k+1), ticketId, true) }
                { numberTableRowHTML(Array.from({length: 10},(v,k)=>k+11), ticketId, true) }
              </tbody>
            </table>
          </div>
        </div>
      )
    })
  )

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
            <div className="navbar-start">
              <div className={`navbar-item ${styles.owner}`}>
                <p>Contract Owner: {contractOwner}</p>
              </div>
            </div>
            <div className="navbar-end">
              {address
                ?
                (<div className="navbar-item">
                  <p>Welcome, {address}!</p>
                </div>)
                :
                (<div className="buttons">
                  <button
                    className="button is-primary"
                    onClick={connectWalletHandler}>
                    Connect Wallet
                  </button>
                </div>)
              }
            </div>
          </div>
        </nav>
        <div className="container">
          <div className="columns">
            <div className="column">
              <h1>Total prize in pool: {totalPot} Ether</h1>
            </div>
            <div className="column">
              <h1>Number of tickets in pool: </h1>
            </div>
            <div className="column">
              <h1>Ticket Price: {ticketPrice} Wei</h1>
            </div>
          </div>
        </div>
        <div className="container">
          <section className="mt-5 ">
            <div className="columns">
              <div className="column is-two-thirds">
                <div className="container playForm">
                  <section className="chooseQuantity">
                    <div className="title">
                      <div>1. Select number of games:</div>
                    </div>
                    <div className="select">
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
                  </section>
                  <section className="selectTickets">
                    {selectNumbersHTML()}
                  </section>
                </div>
                <section className="mt-5">
                  <button
                    className="button is-link is-large is-light mt-3"
                    onClick={placeBetHandler}>
                    Play Now
                  </button>
                </section>
                <section className="mt-5">
                  <button
                    className="button is-link is-large is-light mt-3"
                    onClick={withdrawHandler}>
                    Withdraw my rewards
                  </button>
                </section>
                {isOwner && 
                  (<section className="mt-6">
                    <p><b>Admin only: </b> Pick Winner</p>
                    <button className="button is-primary is-large is-light mt-3" onClick={drawHandler}>Pick Winner</button>
                  </section>)
                }
                <section className="mt-6">
                  <div className="container has-text-danger">
                    <p>{error.message}</p>
                  </div>
                </section>
              </div>
              <div className={`${styles.lotteryInfo} column is-one-third`}>
                <section className="mt-5">
                  <div className="card">
                    <div className="card-content">
                      <div className="content">
                        <h2>Lottery History</h2>
                        {
                          lotteryHistory.map((round, i) => (
                            <div className="ticket-entry" key={`round-${i}`}>
                              <div>Lottery #{round.drawId}</div>
                              <div>{round.drawTime}</div>
                              {ticketInfoHTML(round.winningTicket)}
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  </div>
                </section>
                <section className="mt-5">
                  <div className="card">
                    <div className="card-content">
                      <div className="content">
                        <h2>My Tickets</h2>
                        {myTicketsInPool && (
                          <div className="ticket-entries">
                            {
                              myTicketsInPool.map((ticket, i) => (
                                <div className="ticket-entry" key={`round-${i}`}>
                                  {ticketInfoHTML(ticket)}
                                </div>
                              ))
                            }
                          </div>)
                        }
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
