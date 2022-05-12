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

  const [contractOwner, setContractOwner] = useState()
  const [ticketPrice, setTicketPrice] = useState(0) // stored in terms of ether
  const [totalPot, setTotalPot] = useState(0)
  const [lotteryHistory, setLotteryHistory] = useState([])
  const [lotteryId, setLotteryId] = useState(0)
  const [error, setError] = useState('')

  const [isOwner, setIsOwner] = useState(false)
  //const [myTickets, setMyTickets] = useState()

  // current round of draw related
  const [numOfTickets, setNumOfTickets] = useState(4)
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
  
  const [ticketsToPlace, setTicketsToPlace] = useState(initialiseTickets())

  // Check if wallet is connect upon loading (once only)
  useEffect(() => {    
    checkIfWalletIsConnected()
  }, [])

  // Check contract info whenever the localContract is created
  useEffect(() => {
    if (localContract) {
      updateContractInfo()
      updateLotteryInfo()
    }
  }, [localContract])

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

        for (let i = parseInt(drawId); i > 0; --i) {
          const pastDraw = await localContract.methods.pastDraws(i).call()
          console.log(pastDraw)
          setLotteryHistory(lotteryHistory => [...lotteryHistory, pastDraw])
        }
        setLotteryId(drawId)
        
        setTotalPot(web3.utils.fromWei(totalPot, 'ether'))
      } catch (err) {
        setError(err)
      }
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
    const sanitisedTickets = ticketsToPlace.map(ticket => {
      ticket.balls = ticket.balls.sort((a, b) => a - b)
      return [
        ...ticket.balls,
        ticket.powerball
      ]
    })

    console.log(sanitisedTickets)
    console.log(numOfTickets, ticketPrice, numOfTickets * ticketPrice)
    try {
      await localContract.methods.play(sanitisedTickets).send({
        from: address,
        value: numOfTickets * ticketPrice,
        // value: web3.utils.toWei(`${numOfTickets * ticketPrice}`, 'ether'),
        gas: 1000000,
        gasPrice: null
      })

      updateLotteryInfo()
    } catch (err) {
      console.log('error here')
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
    try {
      await localContract.methods.draw().send({
        from: address,
        gas: 1000000,
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
    console.log(modifiedTickets)
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
          <div className="gameRowCells">
            <div className="gameRowCell"></div>
          </div>
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
