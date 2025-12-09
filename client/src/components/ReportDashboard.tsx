import React, { useState } from 'react';
import type { ScoreReport, Issue } from '../types';

interface ReportDashboardProps {
    report: ScoreReport;
}

const CategoryCard: React.FC<{ title: string; score: number }> = ({ title, score }) => {
    let color = 'var(--success)';
    if (score < 50) color = 'var(--danger)';
    else if (score < 80) color = 'var(--warning)';

    return (
        <div className="category-card">
            <h3>{title}</h3>
            <div className="score" style={{ color }}>{score}</div>
            <div className="bar-bg">
                <div className="bar-fill" style={{ width: `${score}%`, background: color }}></div>
            </div>
        </div>
    );
};

const IssueItem: React.FC<{ issue: Issue }> = ({ issue }) => {
    const [expanded, setExpanded] = useState(false);

    const getSeverityColor = (s: string) => {
        switch (s) {
            case 'Critical': return 'var(--danger)';
            case 'Major': return '#f97316'; // Orange
            case 'Minor': return 'var(--warning)';
            default: return 'var(--text-secondary)';
        }
    };

    return (
        <div className="issue-item">
            <div className="issue-header" onClick={() => setExpanded(!expanded)}>
                <span className="severity-badge" style={{ background: getSeverityColor(issue.severity) }}>
                    {issue.severity}
                </span>
                <span className="issue-title">{issue.title}</span>
                <span className="toggle-icon">{expanded ? '−' : '+'}</span>
            </div>

            {expanded && (
                <div className="issue-details">
                    <p className="affected-url"><strong>URL:</strong> {issue.affectedUrl}</p>
                    <p className="description">{issue.description}</p>
                </div>
            )}
        </div>
    );
};

export const ReportDashboard: React.FC<ReportDashboardProps> = ({ report }) => {
    const score = report.overallScore;
    let scoreColor = 'var(--success)';
    if (score < 50) scoreColor = 'var(--danger)';
    else if (score < 80) scoreColor = 'var(--warning)';

    return (
        <div className="dashboard-container">
            <div className="score-overview">
                <div className="score-circle-container">
                    <svg viewBox="0 0 36 36" className="circular-chart">
                        <path className="circle-bg"
                            d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path className="circle"
                            strokeDasharray={`${score}, 100`}
                            d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
                            style={{ stroke: scoreColor }}
                        />
                        <text x="18" y="20.35" className="percentage">{score}</text>
                    </svg>
                    <div className="score-label">Overall Score</div>
                </div>

                <div className="category-grid">
                    {Object.entries(report.categories).map(([key, val]) => (
                        <CategoryCard key={key} title={key} score={val} />
                    ))}
                </div>
            </div>

            <div className="issues-section">
                <h2>Detailed Findings ({report.details.length})</h2>
                {report.details.length === 0 ? (
                    <div className="empty-state">No issues found! Great job.</div>
                ) : (
                    <div className="issues-list">
                        {report.details.map((issue, idx) => (
                            <IssueItem key={idx} issue={issue} />
                        ))}
                    </div>
                )}
            </div>

            <style>{`
        .dashboard-container {
            animation: fadeIn 0.8s ease-out;
        }

        .score-overview {
            display: grid;
            grid-template-columns: 300px 1fr;
            gap: 4rem;
            margin-bottom: 4rem;
            align-items: center;
        }

        .circular-chart {
            display: block;
            margin: 0 auto;
            max-width: 200px;
            max-height: 250px;
        }
        .circle-bg {
            fill: none;
            stroke: var(--bg-secondary);
            stroke-width: 3.8;
        }
        .circle {
            fill: none;
            stroke-width: 2.8;
            stroke-linecap: round;
            animation: progress 1s ease-out forwards;
        }
        .percentage {
            fill: var(--text-primary);
            font-family: sans-serif;
            font-weight: bold;
            font-size: 0.5em;
            text-anchor: middle;
        }
        .score-label {
            text-align: center;
            margin-top: 1rem;
            font-size: 1.2rem;
            font-weight: 600;
        }

        .category-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 1.5rem;
        }

        .category-card {
            background: var(--bg-secondary);
            padding: 1.5rem;
            border-radius: var(--radius);
            text-align: center;
            border: 1px solid var(--border);
        }

        .category-card h3 {
            margin: 0 0 0.5rem 0;
            font-size: 0.9rem;
            color: var(--text-secondary);
        }

        .category-card .score {
            font-size: 1.8rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
        }

        .bar-bg {
            background: rgba(255,255,255,0.05);
            height: 4px;
            border-radius: 2px;
            overflow: hidden;
        }
        .bar-fill {
            height: 100%;
        }

        .issues-section h2 {
             margin-bottom: 1.5rem;
             border-bottom: 1px solid var(--border);
             padding-bottom: 1rem;
        }

        .issue-item {
            background: var(--bg-secondary);
            border-radius: var(--radius);
            margin-bottom: 1rem;
            border: 1px solid var(--border);
            overflow: hidden;
        }

        .issue-header {
            padding: 1rem;
            display: flex;
            align-items: center;
            cursor: pointer;
            gap: 1rem;
            transition: background 0.2s;
        }
        .issue-header:hover {
            background: rgba(255,255,255,0.02);
        }

        .severity-badge {
            padding: 0.2rem 0.6rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 700;
            color: #fff;
            text-transform: uppercase;
        }

        .issue-title {
            flex: 1;
            font-weight: 500;
        }

        .issue-details {
            padding: 1rem;
            background: rgba(0,0,0,0.2);
            border-top: 1px solid var(--border);
            font-size: 0.9rem;
            color: var(--text-secondary);
        }

        .affected-url {
            font-family: monospace;
            margin-bottom: 0.5rem;
        }
        
        @media (max-width: 900px) {
            .score-overview {
                grid-template-columns: 1fr;
                gap: 2rem;
            }
        }
        @keyframes progress {
            0% { stroke-dasharray: 0 100; }
        }
      `}</style>
        </div>
    );
};
