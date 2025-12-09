import React, { useState } from 'react';

interface ScanFormProps {
    onStart: (url: string) => void;
}

export const ScanForm: React.FC<ScanFormProps> = ({ onStart }) => {
    const [url, setUrl] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (url) {
            let formattedUrl = url;
            if (!url.startsWith('http')) {
                formattedUrl = `https://${url}`;
            }
            onStart(formattedUrl);
        }
    };

    return (
        <div className="scan-form-container">
            <div className="hero-text">
                <h2>Audit Your Website Instantly</h2>
                <p>Enter a URL to get a comprehensive report on performance, SEO, accessibility, and potential errors.</p>
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

        @media (max-width: 600px) {
            .url-form {
                flex-direction: column;
            }
        }
      `}</style>
        </div>
    );
};
