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

import type { ScoreReport } from './scorer'; // We need to import this or define it. Ideally import.
// To avoid circular dependency or issues, let's just use 'any' for report temporarily or move types to shared file.
// Actually, let's just assume ScoreReport is correct.

interface ScanState {
    id: string;
    url: string;
    devices?: string[];
    status: 'IDLE' | 'QUEUED' | 'SCANNING' | 'COMPLETE' | 'FAILED';
    progress: number;
    message: string;
    report: any | null;
    timestamp: number;
    queuePosition?: number;
    estimatedWaitTime?: number;
}

const scans = new Map<string, ScanState>();
const scanQueue: string[] = [];
let isScanning = false;

// Track scan durations for wait time estimation
const scanDurations: number[] = [];
const MAX_DURATION_SAMPLES = 10;
const DEFAULT_SCAN_DURATION = 60000; // 60 seconds default

function getAverageScanDuration(): number {
    if (scanDurations.length === 0) {
        return DEFAULT_SCAN_DURATION;
    }
    const sum = scanDurations.reduce((a, b) => a + b, 0);
    return sum / scanDurations.length;
}

function updateQueuePositions() {
    const avgDuration = getAverageScanDuration();

    scanQueue.forEach((scanId, index) => {
        const scan = scans.get(scanId);
        if (scan && scan.status === 'QUEUED') {
            const position = index + 1;
            const estimatedWait = Math.round((position * avgDuration) / 1000); // in seconds

            scans.set(scanId, {
                ...scan,
                queuePosition: position,
                estimatedWaitTime: estimatedWait
            });

            // Emit queue update to this specific scan
            io.to(scanId).emit('queue:update', {
                scanId,
                queuePosition: position,
                estimatedWaitTime: estimatedWait
            });
        }
    });
}

// Main queue processing loop
async function processQueue() {
    if (isScanning || scanQueue.length === 0) {
        return;
    }

    const scanId = scanQueue.shift();
    if (!scanId) return;

    const scanState = scans.get(scanId);
    if (!scanState) {
        processQueue();
        return;
    }

    isScanning = true;
    const scanStartTime = Date.now();

    const updateState = (update: Partial<ScanState>) => {
        const current = scans.get(scanId);
        if (current) {
            scans.set(scanId, { ...current, ...update });
        }
    };

    updateState({ status: 'SCANNING', message: 'Starting scan...', progress: 0 });
    io.to(scanId).emit('scan:progress', { scanId, message: 'Starting scan...', progress: 0 });

    // Update positions for remaining queued scans
    updateQueuePositions();

    try {
        await runScan(scanState.url, scanId, io, updateState, scanState.devices || []);

        // Track scan duration
        const scanDuration = Date.now() - scanStartTime;
        scanDurations.push(scanDuration);
        if (scanDurations.length > MAX_DURATION_SAMPLES) {
            scanDurations.shift();
        }
    } catch (err) {
        console.error(`Scan ${scanId} failed:`, err);
        updateState({ status: 'FAILED', message: 'Scan failed due to server error.' });
        io.to(scanId).emit('scan:error', { message: 'Internal Server Error' });
    } finally {
        isScanning = false;
        processQueue();
    }
}

app.use(cors());
app.use(express.json());

app.post('/api/scan', async (req, res) => {
    const { url, devices } = req.body;
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    if (!devices || !Array.isArray(devices) || devices.length === 0) {
        return res.status(400).json({ error: 'At least one device must be selected' });
    }

    const scanId = Date.now().toString();

    // Initialize state as QUEUED
    const queuePosition = scanQueue.length + 1;
    const avgDuration = getAverageScanDuration();
    const estimatedWait = Math.round((queuePosition * avgDuration) / 1000);

    scans.set(scanId, {
        id: scanId,
        url,
        devices,
        status: 'QUEUED',
        progress: 0,
        message: 'Waiting in queue...',
        report: null,
        timestamp: Date.now(),
        queuePosition,
        estimatedWaitTime: estimatedWait
    });

    scanQueue.push(scanId);

    // Try to process queue
    processQueue();

    res.json({
        message: 'Scan queued',
        scanId,
        queuePosition,
        estimatedWaitTime: estimatedWait
    });
});

app.get('/api/scan/:scanId', (req, res) => {
    const { scanId } = req.params;
    const scan = scans.get(scanId);
    if (!scan) {
        return res.status(404).json({ error: 'Scan not found' });
    }
    res.json(scan);
});

io.on('connection', (socket) => {
    console.log('Client connected', socket.id);

    socket.on('join_scan', (scanId) => {
        console.log(`Socket ${socket.id} joining scan ${scanId}`);
        socket.join(scanId);

        // Send current state immediately
        const scan = scans.get(scanId);
        if (scan) {
            if (scan.status === 'SCANNING' || scan.status === 'QUEUED') {
                socket.emit('scan:progress', { scanId, message: scan.message, progress: scan.progress });

                // If queued, also send queue position info
                if (scan.status === 'QUEUED' && scan.queuePosition && scan.estimatedWaitTime !== undefined) {
                    socket.emit('queue:update', {
                        scanId,
                        queuePosition: scan.queuePosition,
                        estimatedWaitTime: scan.estimatedWaitTime
                    });
                }
            } else if (scan.status === 'COMPLETE') {
                socket.emit('scan:complete', { scanId, report: scan.report });
            }
        }
    });
});

const PORT = Number(process.env.PORT) || 3000;

httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
