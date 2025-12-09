import { useState, useEffect } from 'react';
import io, { Socket } from 'socket.io-client';
import { ScanForm } from './components/ScanForm';
import { ReportDashboard } from './components/ReportDashboard';
import './styles/theme.css';

import type { ScoreReport } from './types';

interface ScanProgress {
  message: string;
  progress: number;
}

const socket: Socket = io('http://localhost:3001');

function App() {
  const [status, setStatus] = useState<'IDLE' | 'SCANNING' | 'COMPLETE'>('IDLE');
  const [progress, setProgress] = useState<ScanProgress>({ message: '', progress: 0 });
  const [report, setReport] = useState<ScoreReport | null>(null);

  useEffect(() => {
    socket.on('connect', () => console.log('Connected to server'));

    socket.on('scan:progress', (data) => {
      setStatus('SCANNING');
      setProgress({ message: data.message, progress: data.progress });
    });

    socket.on('scan:complete', (data) => {
      setReport(data.report);
      setStatus('COMPLETE');
    });

    return () => {
      socket.off('connect');
      socket.off('scan:progress');
      socket.off('scan:complete');
    };
  }, []);

  const startScan = async (url: string) => {
    setStatus('SCANNING');
    setProgress({ message: 'Initializing scan...', progress: 0 });
    try {
      await fetch('http://localhost:3001/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
    } catch {
      alert('Failed to start scan server might be down.');
      setStatus('IDLE');
    }
  };

  const reset = () => {
    setStatus('IDLE');
    setReport(null);
  };

  return (
    <div className="app-container">
      <header className="main-header">
        <h1>WebAudit<span className="accent">.Ai</span></h1>
        {status === 'COMPLETE' && <button onClick={reset} className="btn-secondary">New Scan</button>}
      </header>

      <main>
        {status === 'IDLE' && <ScanForm onStart={startScan} />}

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
