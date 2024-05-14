require('dotenv').config(); // Loads the environment variables from the .env file.
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors'); // Middleware to enable CORS.
const Poll = require('./models/Poll'); // Ensure this path to models is correct.
const authRoutes = require('./routes/auth'); // Adjust the path as necessary for authentication routes.

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000", // Allowing CORS for all requests from the frontend URL.
    methods: ["GET", "POST", "PATCH"],
    credentials: true
  }
});

// Middleware setup
app.use(cors({
  origin: 'http://localhost:3000', // Configures CORS to accept requests from your frontend.
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true // Allows cookies and headers to be included in requests.
})); 
app.use(express.json()); // Parses incoming JSON requests and puts the parsed data in req.body.

// MongoDB connection setup
const mongoURI = process.env.MONGO_URI;
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

mongoose.connection.on('connected', () => {
  console.log('MongoDB connection established successfully');
});

mongoose.connection.on('error', (err) => {
  console.log('MongoDB connection error:', err);
});

// Serve static files from the 'public' directory of frontend
app.use(express.static('../frontend/build'));

// Use routes for authentication
app.use('/auth', authRoutes);

// Real-time connection handling with Socket.IO
io.on('connection', (socket) => {
  console.log('New client connected');
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Polls API Endpoints
app.get('/polls', async (req, res) => {
  try {
    const polls = await Poll.find();
    res.json(polls);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/polls', async (req, res) => {
  const { question, options } = req.body;
  const poll = new Poll({
    question: question,
    options: options.map(option => ({ text: option, votes: 0 }))
  });

  try {
    const newPoll = await poll.save();
    res.status(201).json(newPoll);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.patch('/polls/:id/vote', async (req, res) => {
  const { id } = req.params;
  const { option } = req.body;

  try {
    const poll = await Poll.findById(id);
    const optionToUpdate = poll.options.find(opt => opt.text === option);
    if (optionToUpdate) {
      optionToUpdate.votes += 1;
      await poll.save();
      io.emit('pollUpdated', poll); // Notify all clients of the poll update.
      res.json(poll);
    } else {
      res.status(404).send('Option not found');
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
