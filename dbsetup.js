const mysql = require('mysql2/promise');

async function setupDatabase() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'wpr',
    password: 'fit2023',
    database: 'wpr2023',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  try {
    const connection = await pool.getConnection();

    // Create 'users' table if not exists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        fullname VARCHAR(255)
      )
    `);

    // Create 'emails' table if not exists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS emails (
        id INT AUTO_INCREMENT PRIMARY KEY,
        fromUserID INT NOT NULL,
        toUserID INT NOT NULL,
        subject VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (fromUserID) REFERENCES users(id),
        FOREIGN KEY (toUserID) REFERENCES users(id)
      )
    `);

    // Create 'composed_emails' table if not exists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS composed_emails (
        id INT AUTO_INCREMENT PRIMARY KEY,
        recipient_id INT NOT NULL,
        subject VARCHAR(255) NOT NULL DEFAULT '(no subject)',
        body TEXT,
        attachment VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);


    const [existingUsers] = await connection.query('SELECT COUNT(*) as countU FROM users');
    const userCount = existingUsers[0].countU;

    if (userCount === 0) {
    // Insert users if they do not exist
    const insertUsers = `
      INSERT IGNORE INTO users (fullname, email, password) VALUES 
      ('User 1' , 'a@a.com', 'a_password'),
      ('User 2' , 'b@b.com', 'b_password'),
      ('User 3' , 'c@c.com', 'c_password')
    `;
    await connection.query(insertUsers);
    }

    // Get user IDs
    const [userRows] = await connection.query('SELECT id FROM users WHERE email IN (?, ?, ?)', [
      'a@a.com',
      'b@b.com',
      'c@c.com',
    ]);

    const [userIdA, userIdB, userIdC] = userRows.map((row) => row.id);

    const [existingEmails] = await connection.query('SELECT COUNT(*) as countE FROM emails');
    const emailCount = existingEmails[0].countE;

    if (emailCount === 0) {
      // Insert emails only if no emails exist in the 'emails' table
      const insertEmails = `
        INSERT INTO emails (fromUserID, toUserID, subject, body) VALUES 
        (${userIdC}, ${userIdB}, 'Subject 1', 'Body 1'),
        (${userIdB}, ${userIdA}, 'Subject 2', 'Body 2'),
        (${userIdC}, ${userIdA}, 'Subject 3', 'Body 3'),
        (${userIdA}, ${userIdC}, 'Subject 4', 'Body 4'),
        (${userIdB}, ${userIdC}, 'Subject 5', 'Body 5'),
        (${userIdC}, ${userIdB}, 'Subject 6', 'Body 6'),
        (${userIdA}, ${userIdB}, 'Subject 7', 'Body 7'),
        (${userIdB}, ${userIdA}, 'Subject 8', 'Body 8'),
        (${userIdA}, ${userIdB}, 'Subject 9', 'Body 9'),
        (${userIdC}, ${userIdA}, 'Subject 10', 'Body 10'),
        (${userIdA}, ${userIdC}, 'Subject 11', 'Body 11'),
        (${userIdB}, ${userIdC}, 'Subject 12', 'Body 12'),
        (${userIdC}, ${userIdB}, 'Subject 13', 'Body 13'),
        (${userIdA}, ${userIdB}, 'Subject 14', 'Body 14'),
        (${userIdB}, ${userIdA}, 'Subject 15', 'Body 15'),
        (${userIdA}, ${userIdB}, 'Subject 16', 'Body 16'),
        (${userIdC}, ${userIdA}, 'Subject 17', 'Body 17'),
        (${userIdA}, ${userIdC}, 'Subject 18', 'Body 18'),
        (${userIdB}, ${userIdC}, 'Subject 19', 'Body 19'),
        (${userIdC}, ${userIdB}, 'Subject 20', 'Body 20')
      `;
      await connection.query(insertEmails);
    }

    console.log('Database setup completed successfully!');

    // Release the connection
    connection.release();

    return pool;
  } catch (error) {
    console.error('Error setting up the database:', error);
    throw error;
  }
}

module.exports = setupDatabase;

// Run setup if this file is executed directly
if (require.main === module) {
  setupDatabase().catch(console.error);
}