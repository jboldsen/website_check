import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { runScan } from './scanner';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Allow all for dev
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

app.post('/api/scan', async (req, res) => {
    const { url } = req.body;
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    // Generate a unique ID for the scan (simple timestamp for now or uuid)
    const scanId = Date.now().toString();

    // Start scan asynchronously
    runScan(url, scanId, io).catch(console.error);

    res.json({ message: 'Scan started', scanId });
});

io.on('connection', (socket) => {
    console.log('Client connected', socket.id);
});

const PORT = 3001;
httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
