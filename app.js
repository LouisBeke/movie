const express = require('express');
const mysql = require('mysql2');
const app = express();
const port = 3000;
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });
const jsQR = require('jsqr');
const NodeWebcam = require('node-webcam');

// Set up webcam
const Webcam = NodeWebcam.create({
  width: 1280,
  height: 720,
  quality: 100,
  output: 'jpeg',
  verbose: true,
});

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

const db = mysql.createConnection({
  host: '64.227.79.50',
  user: 'louis',
  password: 'Ibgo17112005@louis',
  database: 'MovieDB',
});

db.connect((err) => {
  if (err) {
    console.error('Database connection error: ' + err.stack);
    return;
  }
  console.log('Connected to MySQL database as id ' + db.threadId);
});

const movieTableSchema = `
    CREATE TABLE IF NOT EXISTS movies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        barcode VARCHAR(255) NOT NULL
    );
`;

db.query(movieTableSchema, (err, results) => {
    if (err) throw err;
    console.log('Movies table created');
});

app.get('/', (req, res) => {
  const sql = 'SELECT * FROM Movies';
  db.query(sql, (err, result) => {
    if (err) throw err;
    res.render('index', { movies: result });
  });
});

app.post('/add', async (req, res) => {
  const { title, barcode } = req.body;
  let id = 1; // Default ID to 1

  // Check if ID 1 exists in the database
  const idCheckQuery = 'SELECT id FROM Movies WHERE id = 1';
  const [existingRow] = await db.promise().query(idCheckQuery);

  if (existingRow.length === 0) {
    // ID 1 is not in the database; use it
    id = 1;
  } else {
    // ID 1 is already used; find the next available ID
    const maxIdQuery = 'SELECT MAX(id) as max_id FROM Movies';
    const [maxIdRow] = await db.promise().query(maxIdQuery);
    id = maxIdRow[0].max_id + 1;
  }

  const insertQuery = 'INSERT INTO Movies (id, title, barcode) VALUES (?, ?, ?)';
  db.query(insertQuery, [id, title, barcode], (err, result) => {
    if (err) {
      console.error("SQL Error:", err);
      res.status(500).send(err);
    } else {
      //res.status(201).send(result);
      res.redirect('/');
    }
  });
});


app.post('/delete', (req, res) => {
  const movieId = req.body.id; // This assumes that "id" is the name of the hidden input field in your form
  const sql = 'DELETE FROM Movies WHERE ID = ?'; // Use "ID" as the column name
  db.query(sql, [movieId], (err, result) => {
    if (err) {
      console.error("Error deleting movie:", err);
      return res.status(500).send("Error deleting movie.");
    }
    console.log("Deleted movie with ID:", movieId);
    res.redirect('/');
  });
});

app.get('/search', (req, res) => {
  const searchTerm = req.query.q;
  const sql = 'SELECT * FROM Movies WHERE title LIKE ?';
  const searchQuery = `%${searchTerm}%`;
  db.query(sql, [searchQuery], (err, result) => {
    if (err) throw err;
    res.render('index', { movies: result });
  });
});

// Add a new route for capturing barcode from camera
app.get('/capture', (req, res) => {
  Webcam.capture('barcode-image', (err, data) => {
    if (err) {
      console.error('Error capturing image:', err);
      res.status(500).send('Error capturing image');
    } else {
      // Read the captured image file
      const imageBuffer = fs.readFileSync('barcode-image.jpg');

      // Use jsQR to decode the barcode from the image
      const code = jsQR(imageBuffer, imageBuffer.width, imageBuffer.height);

      if (code) {
        console.log('Decoded barcode:', code.data);

        // Render a page with the decoded barcode
        res.render('barcode', { barcode: code.data });
      } else {
        console.log('No barcode found in the image');
        res.status(404).send('No barcode found in the image');
      }
    }
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
