import { useState, useEffect } from 'react';
import io, { Socket } from 'socket.io-client';
import { ScanForm } from './components/ScanForm';
import { ReportDashboard } from './components/ReportDashboard';
import './styles/theme.css';

console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);
console.log('ALL ENV:', import.meta.env);

import type { ScoreReport } from './types';

interface ScanProgress {
  message: string;
  progress: number;
}

interface QueueInfo {
  position: number;
  estimatedWaitTime: number;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const socket: Socket = io(API_URL);

function App() {
  const [status, setStatus] = useState<'IDLE' | 'QUEUED' | 'SCANNING' | 'COMPLETE'>('IDLE');
  const [progress, setProgress] = useState<ScanProgress>({ message: '', progress: 0 });
  const [report, setReport] = useState<ScoreReport | null>(null);
  const [queueInfo, setQueueInfo] = useState<QueueInfo | null>(null);

  useEffect(() => {
    socket.on('connect', () => console.log('Connected to server'));

    socket.on('scan:progress', (data) => {
      if (data.message.includes('queue')) {
        setStatus('QUEUED');
      } else {
        setStatus('SCANNING');
        setQueueInfo(null); // Clear queue info when scanning starts
      }
      setProgress({ message: data.message, progress: data.progress });
    });

    socket.on('queue:update', (data) => {
      setQueueInfo({
        position: data.queuePosition,
        estimatedWaitTime: data.estimatedWaitTime
      });
    });

    socket.on('scan:complete', (data) => {
      setReport(data.report);
      setStatus('COMPLETE');
      setQueueInfo(null);
    });

    // Check URL for existing scan
    const params = new URLSearchParams(window.location.search);
    const scanId = params.get('scanId');
    if (scanId) {
      restoreScan(scanId);
    }

    return () => {
      socket.off('connect');
      socket.off('scan:progress');
      socket.off('queue:update');
      socket.off('scan:complete');
    };
  }, []);

  const restoreScan = async (scanId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/scan/${scanId}`);
      if (res.ok) {
        const state = await res.json();
        if (state.status === 'SCANNING' || state.status === 'QUEUED') {
          setStatus(state.status);
          setProgress({ message: state.message, progress: state.progress });

          // Restore queue info if available
          if (state.status === 'QUEUED' && state.queuePosition && state.estimatedWaitTime !== undefined) {
            setQueueInfo({
              position: state.queuePosition,
              estimatedWaitTime: state.estimatedWaitTime
            });
          }
        } else if (state.status === 'COMPLETE') {
          setReport(state.report);
          setStatus('COMPLETE');
        }
        socket.emit('join_scan', scanId);
      } else {
        // Invalid scan ID, clear URL
        window.history.pushState({}, '', window.location.pathname);
      }
    } catch (e) {
      console.error("Failed to restore scan", e);
    }
  };

  const startScan = async (url: string, devices: string[]) => {
    // Initial optimistic state
    setStatus('QUEUED');
    setProgress({ message: 'Requesting scan...', progress: 0 });
    try {
      const res = await fetch(`${API_URL}/api/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, devices })
      });
      if (res.ok) {
        const data = await res.json();
        const scanId = data.scanId;

        // Set initial queue info from response
        if (data.queuePosition && data.estimatedWaitTime !== undefined) {
          setQueueInfo({
            position: data.queuePosition,
            estimatedWaitTime: data.estimatedWaitTime
          });
        }

        // Update URL
        const newUrl = `${window.location.pathname}?scanId=${scanId}`;
        window.history.pushState({ path: newUrl }, '', newUrl);

        socket.emit('join_scan', scanId);
      }
    } catch {
      alert('Failed to start scan server might be down.');
      setStatus('IDLE');
    }
  };

  const reset = () => {
    setStatus('IDLE');
    setReport(null);
    // Clear URL param
    window.history.pushState({}, '', window.location.pathname);
  };

  return (
    <div className="app-container">
      <header className="main-header">
        <h1>WebAudit<span className="accent">.Ai</span></h1>
        {status === 'COMPLETE' && <button onClick={reset} className="btn-secondary">New Scan</button>}
      </header>

      <main>
        {status === 'IDLE' && <ScanForm onStart={startScan} />}

        {status === 'QUEUED' && (
          <div className="progress-container">
            <div className="loader"></div>
            <h2>Scan Queued</h2>
            <p className="status-message">{progress.message}</p>

            {queueInfo && (
              <div className="queue-info">
                <div className="queue-stat">
                  <span className="queue-label">Position in Queue:</span>
                  <span className="queue-value">#{queueInfo.position}</span>
                </div>
                <div className="queue-stat">
                  <span className="queue-label">Estimated Wait:</span>
                  <span className="queue-value">
                    {queueInfo.estimatedWaitTime < 60
                      ? `${queueInfo.estimatedWaitTime} seconds`
                      : `${Math.round(queueInfo.estimatedWaitTime / 60)} minute${Math.round(queueInfo.estimatedWaitTime / 60) !== 1 ? 's' : ''}`
                    }
                  </span>
                </div>
              </div>
            )}

            <div className="progress-bar-bg">
              {/* Indeterminate or empty bar for queue */}
              <div className="progress-bar-fill" style={{ width: `0%` }}></div>
            </div>
            <p className="queue-hint">Your scan will start automatically when a slot opens.</p>
          </div>
        )}

        {status === 'SCANNING' && (
          <div className="progress-container">
            <div className="loader"></div>
            <h2>Scanning Website...</h2>
            <p className="status-message">{progress.message}</p>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: `${progress.progress}%` }}></div>
            </div>
          </div>
        )}

        {status === 'COMPLETE' && report && <ReportDashboard report={report} />}
      </main>
    </div>
  );
}

export default App;
