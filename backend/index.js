const express = require('express');
const cors = require('cors');
const app = express();

// Use the port Render gives us, or fallback to 5000 locally
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// GET route for the challenge
app.get('/bfhl', (req, res) => {
    res.status(200).json({ "operation_code": 1 });
});

// POST route (logic will be written here tomorrow)
app.post('/bfhl', (req, res) => {
    res.status(200).json({ "is_success": true, "message": "Ready for logic" });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});