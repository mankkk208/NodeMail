const express = require('express');
const cookieParser = require('cookie-parser');
const app = express();
const port = process.env.PORT || 8000;

const setupDatabase = require('./dbsetup'); // Import the database setup function

let pool; // Initialize pool variable

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(express.json());
app.use(cookieParser());

// Routes and other app logic that require 'pool' should be placed here
app.get('/', (req, res) => {
  // Handle root route - render homepage or perform actions
  res.render('index');
});

app.get('/signup', (req, res) => {
  // Handle signup route - render signup page or perform actions
  
  res.render('signup');
});

app.get('/signin', (req, res) => {
  // Handle signin route - render signin page or perform actions
  res.render('signin');
});

app.post('/signin', async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!pool) {
      // If pool is not initialized, set it up
      pool = await setupDatabase();
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length > 0) {
      const user = rows[0];
      if (user.password === password) {
        res.cookie('sessionID', user.id, { httpOnly: true });
        res.status(200).json({ message: 'Authentication successful' });
      } else {
        res.status(401).json({ message: 'Invalid password' });
      }
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Error during sign-in:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/inbox', async (req, res) => {
  try {
    const userEmail = req.query.email;
    let page = parseInt(req.query.page) || 1;
    
    if (!userEmail) {
      return res.status(400).send('User email not provided');
    }

    const user = await retrieveUserInformation(userEmail);

    if (!user) {
      return res.status(404).send('User not found');
    }

    const emailsPerPage = 5;

    // Calculate startIndex and endIndex for pagination
    const startIndex = (page - 1) * emailsPerPage;
    const endIndex = startIndex + emailsPerPage;
    const userEmails = await retrieveUserEmails(user.id, startIndex, endIndex);
    
    
    // Get the total count of emails for the user
    const totalEmailCount = await getTotalEmailCount(user.id);

    // Calculate the total number of pages based on total emails and emails per page
    const numPages = Math.ceil(totalEmailCount / emailsPerPage);

    res.render('inbox', {
      user,
      email: userEmails,
      currentPage: page,
      emailsPerPage,
      displayedEmails: userEmails,
      numPages
    });

  } catch (error) {
    console.error('Error handling inbox request:', error);
    res.status(500).send('Internal server error');
  }
});

app.get('/outbox', async (req, res) => {
  try {
    const userEmail = req.query.email;
    let page = parseInt(req.query.page) || 1;
    
    if (!userEmail) {
      return res.status(400).send('User email not provided');
    }

    const user = await retrieveUserInformation(userEmail);

    if (!user) {
      return res.status(404).send('User not found');
    }

    const emailsPerPage = 5;

    // Calculate startIndex and endIndex for pagination
    const startIndex = (page - 1) * emailsPerPage;
    const endIndex = startIndex + emailsPerPage;
    const userOutgoingEmails = await retrieveOutgoingEmails(user.id, startIndex, endIndex);
    
    // Get the total count of emails for the user
    const totalEmailCount = await getTotalOutgoingEmailCount(user.id);

    // Calculate the total number of pages based on total emails and emails per page
    const numPages = Math.ceil(totalEmailCount / emailsPerPage);

    res.render('outbox', {
      user,
      email: userOutgoingEmails,
      currentPage: page,
      emailsPerPage,
      displayedEmails: userOutgoingEmails,
      numPages
    });

  } catch (error) {
    console.error('Error handling inbox request:', error);
    res.status(500).send('Internal server error');
  }
});

app.get('/compose', async (req, res) => {
  try {
    const userEmail = req.query.email;

    if (!userEmail) {
      return res.status(400).send('User email not provided');
    }

    const user = await retrieveUserInformation(userEmail);

    if (!user) {
      return res.status(404).send('User not found');
    }

    // Fetch all users from the database to populate the recipient dropdown
    const allUsers = await getAllUsers();

    res.render('compose', { user, allUsers, selectedUserId: user.id });
  } catch (error) {
    console.error('Error handling compose request:', error);
    res.status(500).send('Internal server error');
  }
});

app.get('/signout', (req, res) => {
  res.clearCookie('sessionID');
  res.redirect('/');
});



app.post('/signup', async (req, res) => {
  const { fullname, email, password } = req.body;

  try {
    if (!pool) {
      pool = await setupDatabase();
    }

    const [existingUser] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);

    if (existingUser.length > 0) {
      return res.status(400).json({ message: 'Email address is already in use' });
    }

    // Insert the new user into the database
    const result = await pool.query('INSERT INTO users (fullname, email, password) VALUES (?, ?, ?)', [
      fullname,
      email,
      password,
    ]);

    // Check if the user was successfully inserted
    if (result[0].affectedRows === 1) {
      res.status(201).json({ message: 'User created successfully' });
    } else {
      res.status(500).json({ message: 'Failed to create user' });
    }
  } catch (error) {
    console.error('Error during signup:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/checkEmail', async (req, res) => {
  const { email } = req.body;

  try {
    if (!pool) {
      pool = await setupDatabase();
    }

    const [existingUser] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);

    if (existingUser.length > 0) {
      res.status(200).json({ message: 'Email is already in use' });
    } else {
      res.status(200).json({ message: 'Email is available' });
    }
  } catch (error) {
    console.error('Error checking email availability:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/inbox', async (req, res) => {
  try {
    const userEmail = req.body.email;

    // Assuming you have a function to retrieve user information based on their email
    const user = await retrieveUserInformation(userEmail);

    if (user) {
      // If the user exists, retrieve their emails or perform any required actions
      const userEmails = await retrieveUserEmails(user.id); // Assuming you have a function to get user emails by their ID

      res.render('inbox', { user, emails: userEmails });
    } else {
      res.status(404).send('User not found');
    }
  } catch (error) {
    console.error('Error handling inbox request:', error);
    res.status(500).send('Internal server error');
  }
});

app.get('/getEmailDetails/:id', async (req, res) => {
  try {
    const emailId = req.params.id;
    // Fetch email details based on the provided emailId
    const emailDetails = await getEmailDetailsFromDatabase(emailId);
    res.json(emailDetails); // Respond with JSON containing email details
  } catch (error) {
    console.error('Error fetching email details:', error);
    res.status(500).json({ message: 'Failed to fetch email details' });
  }
});

app.post('/send-email', async (req, res) => {
  const {recipientId, subject, body} = req.body;
  const userId = req.cookies.sessionID;
  console.log(req.body);
  try {
    if (!pool) {
      // Ensure the pool is initialized before executing the query
      pool = await setupDatabase();
    }

    const fromUserId = userId;
    console.log(fromUserId, recipientId, subject, body);
    const result = await pool.query(
      'INSERT INTO emails (fromUserID, toUserID, subject, body) VALUES (?, ?, ?, ?)',
      [fromUserId, recipientId, subject || '(no subject)', body || '']
    );

    if (result[0].affectedRows === 1) {
      res.status(200).json({ message: 'Email sent successfully' });
      alert("Email sent successfully");
    } else {
      res.status(500).json({ message: 'Failed to send email' });
    }
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ message: 'Failed to send email' });
  }
});

async function retrieveUserInformation(email) {
  try {
    if (!pool) {
      pool = await setupDatabase();
    }

    const [userRows] = await pool.query('SELECT id, fullname, email FROM users WHERE email = ?', [email]);

    if (userRows.length > 0) {
      console.log('User information found:', userRows[0]);
      return userRows[0]; // Returning the first user found for the given email
    } else {
      console.log('No user found with email:', email);
      return null; // If no user is found with the given email
    }
  } catch (error) {
    console.error('Error retrieving user information:', error);
    throw error;
  }
}

async function retrieveUserEmails(userId, startIndex, endIndex) {
  try {
    if (!pool) {
      pool = await setupDatabase();
    }

    const [emailRows] = await pool.query(
      'SELECT emails.*, users.email AS fromUserEmail FROM emails INNER JOIN users ON emails.fromUserID = users.id WHERE toUserID = ? ORDER BY timestamp DESC LIMIT ?, ?',
      [userId, startIndex, endIndex - startIndex]
    );

    return emailRows;
  } catch (error) {
    console.error('Error retrieving user emails:', error);
    throw error;
  }
}

async function getTotalEmailCount(userId) {
  try {
    if (!pool) {
      pool = await setupDatabase();
    }

    const [countRows] = await pool.query('SELECT COUNT(*) AS total FROM emails WHERE toUserID = ?', [userId]);
    return countRows[0].total;
  } catch (error) {
    console.error('Error retrieving total email count:', error);
    throw error;
  }
}

async function retrieveOutgoingEmails(userId, startIndex, endIndex) {
  try {
    if (!pool) {
      pool = await setupDatabase();
    }

    const [emailRows] = await pool.query(
      'SELECT emails.*, users.email AS fromUserEmail FROM emails INNER JOIN users ON emails.toUserID = users.id WHERE fromUserID = ? ORDER BY timestamp DESC LIMIT ?, ?',
      [userId, startIndex, endIndex - startIndex]
    );

    return emailRows;
  } catch (error) {
    console.error('Error retrieving outgoing emails:', error);
    throw error;
  }
}

async function getTotalOutgoingEmailCount(userId) {
  try {
    if (!pool) {
      pool = await setupDatabase();
    }

    const [countRows] = await pool.query('SELECT COUNT(*) AS total FROM emails WHERE fromUserID = ?', [userId]);
    return countRows[0].total;
  } catch (error) {
    console.error('Error retrieving total email count:', error);
    throw error;
  }
}

async function getEmailDetailsFromDatabase(emailId) {
  try {
    if (!pool) {
      pool = await setupDatabase();
    }

    const [emailRows] = await pool.query('SELECT * FROM emails WHERE id = ?', [emailId]);

    if (emailRows.length > 0) {
      return emailRows[0]; // Returning the first email found for the given ID
    } else {
      console.log('No email found with ID:', emailId);
      return null; // If no email is found with the given ID
    }
  } catch (error) {
    console.error('Error retrieving email details:', error);
    throw error;
  }
}

async function getAllUsers() {
  try {
    if (!pool) {
      pool = await setupDatabase();
    }

    const [userRows] = await pool.query('SELECT id, fullname, email FROM users');

    return userRows;
  } catch (error) {
    console.error('Error retrieving all users:', error);
    throw error;
  }
}

// Start the server
app.listen(port, () => {
  console.log(`Email system app listening at http://localhost:${port}`);
});
