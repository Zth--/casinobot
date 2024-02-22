// database.js
const sqlite3 = require('sqlite3').verbose()
const Decimal = require('decimal.js')
const { calculateDynamicOdds } = require('../service/dynamic_odds.js')
const DBSOURCE = './casino.db';

const db = new sqlite3.Database(DBSOURCE, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    console.error(err.message);
    throw err;
  } else {
    console.log('Connected to the SQLite database.');
    initializeTables();
  }
});

function beginTransaction() {
  return run('BEGIN TRANSACTION');
}

function commitTransaction() {
  return run('COMMIT');
}

function rollbackTransaction() {
  return run('ROLLBACK');
}

function initializeTables() {
  db.run(`CREATE TABLE IF NOT EXISTS user_balances (
    user_id TEXT PRIMARY KEY,
    balance INTEGER DEFAULT 1000
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS betting_events (
    event_id INTEGER PRIMARY KEY AUTOINCREMENT,
    open BOOLEAN NOT NULL CHECK (open IN (0, 1)),
    winning_outcome TEXT, -- to be filled after the event closes
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    cancellation_requested_at DATETIME DEFAULT NULL,
    cancelled BOOLEAN DEFAULT NULL
)`);

  db.run(`CREATE TABLE IF NOT EXISTS user_bets (
    bet_id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    bet_amount INTEGER NOT NULL,
    bet_on_outcome TEXT NOT NULL, -- The outcome on which the user is betting
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(event_id) REFERENCES betting_events(event_id),
    FOREIGN KEY(user_id) REFERENCES user_balances(user_id)
)`);

  db.run(`CREATE TABLE IF NOT EXISTS user_resurrections (
    user_id TEXT PRIMARY KEY,
    last_claimed DATETIME DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'now', 'localtime')),
    resurrection_count INTEGER DEFAULT 0
)`);

  db.run(`CREATE TABLE IF NOT EXISTS quejas (
    feedback_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    feedback TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);`);

  db.run(`CREATE TABLE IF NOT EXISTS cancellation_votes (
    vote_id INTEGER PRIMARY KEY AUTOINCREMENT,
    bet_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    vote BOOLEAN,
    FOREIGN KEY(bet_id) REFERENCES betting_events(event_id),
    FOREIGN KEY(user_id) REFERENCES user_balances(user_id));
  `);
}

// Utility function to run SQL query with parameters and return a promise
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
}

// Utility function to get data with SQL query and parameters
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}


// Utility function to get multiple rows data with SQL query and parameters
function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

async function createBettingEvent() {
  const result = await run(`INSERT INTO betting_events (open) VALUES (1)`);
  return result.id; // returns the event_id of the newly created event
}

async function placeBet(eventId, userId, amount, outcome) {
  // Check if user exists and has enough balance before placing a bet
  const user = await get(`SELECT balance FROM user_balances WHERE user_id = ?`, [userId]);
  if (!user || user.balance < amount) {
    throw new Error('User does not exist or balance is insufficient.');
  }
  await run(`UPDATE user_balances SET balance = balance - ? WHERE user_id = ?`, [amount, userId]);
  await run(`INSERT INTO user_bets (event_id, user_id, bet_amount, bet_on_outcome) VALUES (?, ?, ?, ?)`, [eventId, userId, amount, outcome]);
  return { eventId, userId, amount, outcome }; // returns the details of the placed bet
}

async function getOpenEvent() {
  return await get(`SELECT * FROM betting_events WHERE open = 1 AND winning_outcome is null ORDER BY created_at DESC LIMIT 1`);
}

async function getActiveEvent() {
  return await get(`SELECT * FROM betting_events WHERE winning_outcome is null ORDER BY created_at DESC LIMIT 1`);
}

async function getLastBetting() {
  return await get(`SELECT * FROM betting_events WHERE open = 0 AND winning_outcome is null ORDER BY created_at DESC LIMIT 1`);
}

async function closeEvent(eventId) {
  await run(`UPDATE betting_events SET open = 0 WHERE event_id = ?`, [eventId]);
  return { eventId }; // returns the event_id
}

async function declareWinner(eventId, winningOutcome) {
  await run(`UPDATE betting_events SET winning_outcome = ? WHERE event_id = ?`, [winningOutcome, eventId]);
  return { eventId, winningOutcome };
}

async function getEventBets(eventId) {
  return await all(`SELECT * FROM user_bets WHERE event_id = ?`, [eventId]);
}

async function getUserBalance(userId) {
  const user = await get(`SELECT balance FROM user_balances WHERE user_id = ?`, [userId]);
  if (user) {
    return user.balance;
  } else {
    return null;
  }
}

async function updateUserBalance(userId, winnings) {
  await run(`UPDATE user_balances SET balance = balance + ? WHERE user_id = ?`, [winnings, userId]);
}

async function createNewUserBalance(userId) {
  await run(`INSERT INTO user_balances (user_id, balance) VALUES (?, 1000)`, [userId]);
  return 1000;
}

async function executeBets(eventId, winningOutcome) {
  let winners = [];
  await beginTransaction();

  try {
    // Fetch all bets for the event
    const bets = await getEventBets(eventId);

    // Calculate the total bet pool and dynamic odds
    const betPool = bets.reduce((pool, bet) => {
      pool[bet.bet_on_outcome] = (pool[bet.bet_on_outcome] || 0) + bet.bet_amount;
      return pool;
    }, {});
    const odds = calculateDynamicOdds(betPool);

    // Process bets
    for (const bet of bets) {
      if (bet.bet_on_outcome === winningOutcome) {
        const betAmount = new Decimal(bet.bet_amount)
        const outcomeOdds = new Decimal(odds[bet.bet_on_outcome])
        const winnings = betAmount.times(outcomeOdds).toNumber()
        // Update the user's balance with the winnings
        winners.push({ user_id: bet.user_id, amount: winnings, betted: betAmount })
        await updateUserBalance(bet.user_id, winnings)
      } else {
        // For losing bets, the balance has already been deducted.
        console.log(`User ID ${bet.user_id} lost their bet of ${bet.bet_amount} on ${bet.bet_on_outcome}`);
      }
    }

    // Declare the winner and close the event
    await declareWinner(eventId, winningOutcome);

    // Commit the transaction
    await commitTransaction();

  } catch (error) {
    // If an error occurs, roll back the transaction
    await rollbackTransaction();
    console.error(`Transaction rolled back due to error: ${error}`);
    throw error; // Rethrow the error to be handled by the caller
  }

  return winners;
}

async function getRankedBalances() {
  return await all(`SELECT * FROM user_balances ORDER BY balance DESC`);
}

async function getLastResurrection(userId) {
  return await get(`SELECT last_claimed FROM user_resurrections WHERE user_id = ?`, [userId]);
}

async function getResurrectionCount(userId) {
  const row = await get(`SELECT resurrection_count FROM user_resurrections WHERE user_id = ?`, [userId]);
  return row ? row.resurrection_count : null;
}

async function resurrectUser(userId) {
  const exists = await get(`SELECT 1 FROM user_resurrections WHERE user_id = ?`, [userId]);
  await updateUserBalance(userId, 100)
  if (exists) {
    await run(`UPDATE user_resurrections SET last_claimed = (STRFTIME('%Y-%m-%d %H:%M:%f', 'now', 'localtime')), resurrection_count = resurrection_count + 1 WHERE user_id = ?`, [userId]);
  } else {
    await run(`INSERT INTO user_resurrections (user_id, resurrection_count) VALUES (?, 1)`, [userId]);
  }
}

async function transferPoints(fromUserId, toUserId, amount) {
  await beginTransaction()
  try {
    const source = await getUserBalance(fromUserId)
    if (!source || source < 1) {
      console.error('Usuario no tiene cuenta o balance', source)
      throw new Error('Usuario no tiene cuenta o balance')

    }
    const recipient = await getUserBalance(toUserId)
    if (recipient == null) {
      console.error('No existe el usuario al que quiere donar ', fromUserId, ' a: ', toUserId)
      throw new Error('No existe el usuario al que querés donar (o no tiene una cuenta todavía)')
    }
    const subtractBalance = await run(`UPDATE user_balances SET balance = balance - ? WHERE user_id = ? AND balance >= ?`, [amount, fromUserId, amount]);
    if (subtractBalance.changes === 0) {
      throw new Error('No hay plata.');
    }
    await run(`UPDATE user_balances SET balance = balance + ? WHERE user_id = ?`, [amount, toUserId]);
    await commitTransaction()
  } catch (error) {
    await rollbackTransaction()
    throw error;
  }
}

async function saveFeedback(userId, feedback) {
  await run(`INSERT INTO quejas (user_id, feedback) VALUES (?, ?)`, [userId, feedback]);
}

//async function castCancellationVote(userId) {
//  await run(`INSERT INTO cancellation_votes ()`)
//}

async function startCancellationVote(userId) {
  await beginTransaction()
  try {
    await run(`UPDATE betting_events SET cancellation_requested_at = NOW()`)
  } catch (e) {
    console.error('Error!', e.message);
    await rollbackTransaction()
    return
  }
  await commitTransaction()
}

module.exports = {
  createBettingEvent,
  placeBet,
  getOpenEvent,
  getActiveEvent,
  getLastBetting,
  closeEvent,
  getEventBets,
  getUserBalance,
  updateUserBalance,
  createNewUserBalance,
  declareWinner,
  executeBets,
  getRankedBalances,
  getLastResurrection,
  getResurrectionCount,
  resurrectUser,
  transferPoints,
  saveFeedback
}
