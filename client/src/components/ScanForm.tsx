import React, { useState } from 'react';
import { Smartphone, Tablet, Monitor, Lock } from 'lucide-react';

interface ScanFormProps {
    onStart: (url: string, devices: string[], pageLimit: number) => void;
}

interface Device {
    id: string;
    name: string;
    width: number;
    icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
}

const DEVICES: Device[] = [
    { id: 'small-mobile', name: 'Small Mobile', width: 375, icon: Smartphone },
    { id: 'mobile', name: 'Mobile', width: 390, icon: Smartphone },
    { id: 'big-mobile', name: 'Big Mobile', width: 430, icon: Smartphone },
    { id: 'tablet-small', name: 'Tablet Small', width: 768, icon: Tablet },
    { id: 'tablet-normal', name: 'Tablet Normal', width: 1024, icon: Tablet },
    { id: 'desktop-small', name: 'Desktop Small', width: 1280, icon: Monitor },
    { id: 'desktop-medium', name: 'Desktop Medium', width: 1366, icon: Monitor },
    { id: 'desktop-normal', name: 'Desktop Normal', width: 1920, icon: Monitor }
];

export const ScanForm: React.FC<ScanFormProps> = ({ onStart }) => {
    const [url, setUrl] = useState('');
    const [selectedDevices, setSelectedDevices] = useState<string[]>(['mobile', 'tablet-normal', 'desktop-normal']);
    const [pageLimit, setPageLimit] = useState<number>(20);
    const [error, setError] = useState('');

    const toggleDevice = (deviceId: string) => {
        setSelectedDevices(prev =>
            prev.includes(deviceId)
                ? prev.filter(id => id !== deviceId)
                : [...prev, deviceId]
        );
        setError('');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!url) {
            setError('Please enter a URL');
            return;
        }

        if (selectedDevices.length === 0) {
            setError('Please select at least one device to test');
            return;
        }

        let formattedUrl = url;
        if (!url.startsWith('http')) {
            formattedUrl = `https://${url}`;
        }
        onStart(formattedUrl, selectedDevices, pageLimit);
    };

    return (
        <div className="scan-form-container">
            <div className="hero-text">
                <h2>Audit Your Website Instantly</h2>
                <p>Enter a URL to get a comprehensive report on performance, SEO, accessibility, and potential errors.</p>
            </div>

            <div className="page-limit-selector">
                <label htmlFor="page-limit">Page Limit</label>
                <div className="select-wrapper">
                    <select
                        id="page-limit"
                        value={pageLimit}
                        onChange={(e) => setPageLimit(Number(e.target.value))}
                        className="page-limit-dropdown"
                    >
                        <option value={5}>5 pages</option>
                        <option value={20}>20 pages</option>
                        <option value={50}>50 pages</option>
                        <option value={-1} disabled>∞ Unlimited (Premium)</option>
                    </select>
                    <Lock size={16} className="dropdown-lock-icon" />
                </div>
            </div>

            <div className="device-selector">
                <h3>Select Devices to Test</h3>
                <div className="device-grid">
                    {DEVICES.map(device => {
                        const IconComponent = device.icon;
                        return (
                            <div
                                key={device.id}
                                className={`device-card ${selectedDevices.includes(device.id) ? 'selected' : ''}`}
                                onClick={() => toggleDevice(device.id)}
                            >
                                <div className="device-icon">
                                    <IconComponent size={32} strokeWidth={2} />
                                </div>
                                <div className="device-name">{device.name}</div>
                                <div className="device-width">{device.width}px</div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <form onSubmit={handleSubmit} className="url-form">
                <input
                    type="text"
                    placeholder="example.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="url-input"
                    autoFocus
                />
                <button type="submit" className="btn-primary">Start Scan</button>
            </form>

            {error && <div className="error-message">{error}</div>}

            <style>{`
        .scan-form-container {
            text-align: center;
            padding: 4rem 0;
            animation: fadeIn 0.5s ease-out;
        }

        .hero-text h2 {
            font-size: 2.5rem;
            margin-bottom: 1rem;
            background: linear-gradient(to right, #f8fafc, #94a3b8);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        .hero-text p {
            color: var(--text-secondary);
            font-size: 1.1rem;
            margin-bottom: 3rem;
        }

        .page-limit-selector {
            margin-bottom: 3rem;
            max-width: 300px;
            margin-left: auto;
            margin-right: auto;
        }

        .page-limit-selector label {
            display: block;
            font-size: 1.2rem;
            margin-bottom: 1rem;
            color: var(--text-primary);
            text-align: center;
        }

        .select-wrapper {
            position: relative;
            display: inline-block;
            width: 100%;
        }

        .page-limit-dropdown {
            width: 100%;
            padding: 1rem 3rem 1rem 1.5rem;
            background: var(--bg-secondary);
            border: 2px solid var(--border);
            border-radius: var(--radius);
            color: var(--text-primary);
            font-size: 1rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            appearance: none;
            -webkit-appearance: none;
            -moz-appearance: none;
            background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
            background-repeat: no-repeat;
            background-position: right 1rem center;
            background-size: 1.2rem;
        }

        .page-limit-dropdown:hover {
            border-color: var(--accent);
            box-shadow: 0 4px 12px var(--accent-glow);
        }

        .page-limit-dropdown:focus {
            outline: none;
            border-color: var(--accent);
            box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.1);
        }

        .page-limit-dropdown option {
            background: var(--bg-secondary);
            color: var(--text-primary);
            padding: 0.5rem;
        }

        .page-limit-dropdown option:disabled {
            color: var(--text-secondary);
            opacity: 0.5;
        }

        .dropdown-lock-icon {
            position: absolute;
            right: 2.8rem;
            top: 50%;
            transform: translateY(-50%);
            color: var(--text-secondary);
            pointer-events: none;
            opacity: 0.6;
        }

        .device-selector {
            margin-bottom: 3rem;
        }

        .device-selector h3 {
            font-size: 1.2rem;
            margin-bottom: 1.5rem;
            color: var(--text-primary);
        }

        .device-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 1rem;
            max-width: 900px;
            margin: 0 auto;
            padding: 0 1rem;
        }

        .device-card {
            background: var(--bg-secondary);
            border: 2px solid var(--border);
            border-radius: var(--radius);
            padding: 1.5rem 1rem;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.5rem;
        }

        .device-card:hover {
            border-color: var(--accent);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px var(--accent-glow);
        }

        .device-card.selected {
            border-color: var(--accent);
            background: linear-gradient(135deg, var(--bg-secondary) 0%, rgba(56, 189, 248, 0.1) 100%);
        }

        .device-icon {
            color: var(--text-secondary);
            margin-bottom: 0.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: color 0.2s;
        }
        
        .device-card.selected .device-icon {
            color: var(--accent);
        }

        .device-name {
            font-weight: 600;
            color: var(--text-primary);
            font-size: 0.9rem;
        }

        .device-width {
            color: var(--text-secondary);
            font-size: 0.8rem;
        }

        .url-form {
            display: flex;
            justify-content: center;
            gap: 1rem;
            max-width: 600px;
            margin: 0 auto;
        }

        .url-input {
            flex: 1;
            padding: 1rem 1.5rem;
            border-radius: var(--radius);
            border: 2px solid var(--border);
            background: var(--bg-secondary);
            color: var(--text-primary);
            font-size: 1rem;
            outline: none;
            transition: border-color 0.2s;
        }

        .url-input:focus {
            border-color: var(--accent);
        }

        .error-message {
            color: var(--danger);
            margin-top: 1rem;
            font-size: 0.9rem;
        }

        @media (max-width: 600px) {
            .url-form {
                flex-direction: column;
            }
            
            .device-grid {
                grid-template-columns: repeat(2, 1fr);
            }
        }
      `}</style>
        </div>
    );
};
