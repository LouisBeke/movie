const express = require('express');
const mysql = require('mysql2');
const app = express();
const port = 3000;
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });
const jsQR = require('jsqr');


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

app.post('/scan', upload.single('barcodeImage'), (req, res) => {
  if (!req.file) {
      return res.status(400).send('No image uploaded. Make sure you selected an image file.');
  }

  const imageBuffer = req.file.buffer;

  try {
      // Log the image data to help with debugging
      console.log('Image Data:', imageBuffer);

      const qrCode = jsQR(new Uint8Array(imageBuffer), imageBuffer.width, imageBuffer.height);

      if (qrCode) {
          // QR code successfully decoded
          const barcodeValue = qrCode.data;

          // You can now use the barcode value in your application
          console.log('Decoded barcode:', barcodeValue);

          // Redirect or render a new page with the barcode value
          res.render('scan-result', { barcodeValue });
      } else {
          // No QR code found
          res.status(400).send('No QR code found in the image.');
      }
  } catch (error) {
      console.error('Error processing the image:', error);
      res.status(500).send('Error processing the image. Please ensure the image is in a supported format and contains a QR code.');
  }
});



app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
