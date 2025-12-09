import React, { useState } from 'react';
import { Smartphone, Tablet, Monitor } from 'lucide-react';

interface ScanFormProps {
    onStart: (url: string, devices: string[]) => void;
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
        onStart(formattedUrl, selectedDevices);
    };

    return (
        <div className="scan-form-container">
            <div className="hero-text">
                <h2>Audit Your Website Instantly</h2>
                <p>Enter a URL to get a comprehensive report on performance, SEO, accessibility, and potential errors.</p>
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
