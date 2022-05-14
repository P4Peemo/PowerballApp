import React from 'react'

import styles from '../styles/TicketInfo.module.scss'

const TicketInfo = ({ticket, isPanelActive=false}) => {
    // for css highlighting the next empty cell
    const checkActiveCell = (ticket, index) => {
        const ticketNums = [...ticket.balls, ticket.powerball]
        return ticketNums.findIndex(ball => ball == 0) == index
    }

    return (
      <div className={styles.gameRowCells}>
        {
          [...Array(7).keys()].map(i => (
            <div className={
                styles.gameRowCell + (ticket.balls[i] == 0 ? '' : (' ' + styles.selectedCell)) +
                (isPanelActive && checkActiveCell(ticket, i) ? (' ' + styles.activeCell) : '')
              } key={`cell-${i+1}`}>
              {ticket.balls[i] == 0 ? '' : ticket.balls[i]}
            </div>
          ))
        }
        <div className={
            styles.powerballCell + (ticket.powerball == 0 ? '' : (' ' + styles.selectedCell)) +
            (isPanelActive && checkActiveCell(ticket, 7) ? (' ' + styles.activeCell) : '')
          }>
          {ticket.powerball == 0 ? 'PB' : ticket.powerball}
        </div>
      </div>
    )    
  }

  export default TicketInfo