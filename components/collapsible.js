import React, { useState } from 'react'
import styles from '../styles/Collapsible.module.scss'

const Collapsible = (props) => {
    const [activePanel, setActivePanel] = useState(-1)
    const { numOfTickets, ticketsToPlace, populateTicketInfo, updateTickets } = props

    const toggleHandler = e => {
        if (e.target.classList.contains(styles.accordion)) {
            const currElem = e.target
            const siblings = currElem.closest('.accordion').querySelectorAll(`.${styles.accordion}`)

            currElem.classList.toggle('active')
            let panel = currElem.nextElementSibling

            if (panel.style.maxHeight) {
                panel.style.maxHeight = null
            } else {
                panel.style.maxHeight = panel.scrollHeight + "px"
            }

            siblings.forEach((el, i) => {
                if (el !== currElem) {
                    el.classList.remove('active')
                    el.nextElementSibling.style.maxHeight = null
                } else {
                    if (currElem.classList.contains('active')) {
                        setActivePanel(i)
                    } else {
                        setActivePanel(-1)
                    }
                }
            })
        }
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
        updateTickets(modifiedTickets)
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

    const checkChecked = (ticketId, value, isPbRow) => {
        const ticket = ticketsToPlace[ticketId]
        if (isPbRow) {
            return ticket.powerball == value
        } else {
            return ticket.balls.includes(value)
        }
    }

    const numberTableRowHTML = (idArray, ticketId, isPbRow) => (
        <tr>
            {
                idArray.map(i => (
                    <td className={styles.ticketNumber} key={`ticket-${ticketId}${isPbRow ? '-pb' : ''}-${i}`}>
                        <input type="checkbox" id={`ticket-${ticketId}${isPbRow ? '-pb' : ''}-${i}`}
                        value={`${i}`} onChange={e => selectNumberHandler(e, ticketId, isPbRow)}
                        disabled={checkDisabled(ticketId, i, isPbRow)}
                        checked={checkChecked(ticketId, i, isPbRow)}/>
                        <label htmlFor={`ticket-${ticketId}${isPbRow ? '-pb' : ''}-${i}`}>{i}</label>
                    </td>
                ))
            }
        </tr>
    )

    return (
        <div className="accordion" onClick={toggleHandler}>
            {ticketsToPlace && (
                [...Array(numOfTickets).keys()].map(ticketId => {
                return (
                    <div className={styles.accordionItem} key={`Ticket ${ticketId + 1}`}>
                        <div className={styles.accordion}>
                            <span>Ticket {ticketId + 1}</span>
                            {populateTicketInfo(ticketsToPlace[ticketId], activePanel == ticketId)}
                        </div>
                        <div className={styles.panel}>
                            <table className="table" style={{ 'margin': '5px auto' }}>
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
                )})
            )}
        </div>
    )
}

export default Collapsible