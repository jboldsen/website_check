import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { runScan } from './scanner';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: ["http://localhost:5173", "https://zapmysite.com"],
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
    pageLimit?: number;
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
const MAX_CONCURRENT_SCANS = 3;
let activeScans = 0;

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
            // Calculate position accounting for concurrent scans
            const position = Math.max(1, index - (MAX_CONCURRENT_SCANS - 1));
            const estimatedWait = Math.round((position * avgDuration) / (MAX_CONCURRENT_SCANS * 1000)); // in seconds

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
    // Process multiple scans concurrently up to MAX_CONCURRENT_SCANS
    while (activeScans < MAX_CONCURRENT_SCANS && scanQueue.length > 0) {
        const scanId = scanQueue.shift();
        if (!scanId) break;

        const scanState = scans.get(scanId);
        if (!scanState) {
            continue;
        }

        activeScans++;

        // Update positions for remaining queued scans
        updateQueuePositions();

        // Run scan asynchronously without blocking other scans
        // Use an IIFE with proper closure to capture scanId and scanState
        ((currentScanId, currentScanState) => {
            const scanStartTime = Date.now();

            const updateState = (update: Partial<ScanState>) => {
                const current = scans.get(currentScanId);
                if (current) {
                    scans.set(currentScanId, { ...current, ...update });
                }
            };

            updateState({ status: 'SCANNING', message: 'Starting scan...', progress: 0 });
            io.to(currentScanId).emit('scan:progress', { scanId: currentScanId, message: 'Starting scan...', progress: 0 });

            console.log(`[${currentScanId}] Starting scan for ${currentScanState.url}`);

            // Execute the scan
            runScan(currentScanState.url, currentScanId, io, updateState, currentScanState.devices || [], currentScanState.pageLimit || 20)
                .then(() => {
                    console.log(`[${currentScanId}] Scan completed successfully`);
                    // Track scan duration
                    const scanDuration = Date.now() - scanStartTime;
                    scanDurations.push(scanDuration);
                    if (scanDurations.length > MAX_DURATION_SAMPLES) {
                        scanDurations.shift();
                    }
                })
                .catch((err) => {
                    console.error(`[${currentScanId}] Scan failed:`, err);
                    updateState({ status: 'FAILED', message: 'Scan failed due to server error.' });
                    io.to(currentScanId).emit('scan:error', { message: 'Internal Server Error' });
                })
                .finally(() => {
                    activeScans--;
                    processQueue();
                });
        })(scanId, scanState);
    }
}

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'scan-server',
        uptime: process.uptime()
    });
});

app.post('/api/scan', async (req, res) => {
    const { url, devices, pageLimit } = req.body;
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    if (!devices || !Array.isArray(devices) || devices.length === 0) {
        return res.status(400).json({ error: 'At least one device must be selected' });
    }

    const scanId = Date.now().toString();

    // Check if scan can start immediately or needs to be queued
    const willStartImmediately = activeScans < MAX_CONCURRENT_SCANS;
    const queuePosition = willStartImmediately ? undefined : Math.max(1, scanQueue.length + 1 - activeScans);
    const avgDuration = getAverageScanDuration();
    const estimatedWait = willStartImmediately ? undefined : Math.round(((queuePosition || 1) * avgDuration) / (MAX_CONCURRENT_SCANS * 1000));

    scans.set(scanId, {
        id: scanId,
        url,
        devices,
        pageLimit: pageLimit || 20, // Default to 20 if not provided
        status: willStartImmediately ? 'SCANNING' : 'QUEUED',
        progress: 0,
        message: willStartImmediately ? 'Starting scan...' : 'Waiting in queue...',
        report: null,
        timestamp: Date.now(),
        queuePosition: willStartImmediately ? undefined : queuePosition,
        estimatedWaitTime: willStartImmediately ? undefined : estimatedWait
    });

    scanQueue.push(scanId);

    // Try to process queue immediately
    processQueue();

    res.json({
        message: willStartImmediately ? 'Scan starting' : 'Scan queued',
        scanId,
        queuePosition: willStartImmediately ? undefined : queuePosition,
        estimatedWaitTime: willStartImmediately ? undefined : estimatedWait
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
