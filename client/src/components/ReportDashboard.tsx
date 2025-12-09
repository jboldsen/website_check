import React, { useState } from 'react';
import type { ScoreReport, Issue, PageReport } from '../types';

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

const PageAccordion: React.FC<{ page: PageReport }> = ({ page }) => {
    const [expanded, setExpanded] = useState(false);

    const getScoreColor = (score: number) => {
        if (score < 50) return 'var(--danger)';
        if (score < 80) return 'var(--warning)';
        return 'var(--success)';
    };

    const color = getScoreColor(page.score);

    return (
        <div className="page-accordion">
            <div className="page-header" onClick={() => setExpanded(!expanded)}>
                <div className="page-score-badge" style={{ color: color, borderColor: color }}>
                    {page.score}
                </div>
                <div className="page-url" title={page.url}>{page.url}</div>
                <div className="toggle-icon">{expanded ? '−' : '+'}</div>
            </div>

            {expanded && (
                <div className="page-details">
                    <div className="page-metrics-grid">
                        <div className="metric-card">
                            <div className="metric-label">Load Time</div>
                            <div className="metric-value">
                                {page.metrics.lcp ? `${Math.round(page.metrics.lcp)}ms` : (page.metrics.duration ? `${Math.round(page.metrics.duration)}ms` : 'N/A')}
                            </div>
                        </div>
                        <div className="metric-card">
                            <div className="metric-label">Performance</div>
                            <div className="metric-value" style={{ color: getScoreColor(page.categoryScores.Performance) }}>
                                {page.categoryScores.Performance}
                            </div>
                        </div>
                        <div className="metric-card">
                            <div className="metric-label">SEO</div>
                            <div className="metric-value" style={{ color: getScoreColor(page.categoryScores.SEO) }}>
                                {page.categoryScores.SEO}
                            </div>
                        </div>
                        <div className="metric-card">
                            <div className="metric-label">Errors</div>
                            <div className="metric-value" style={{ color: getScoreColor(page.categoryScores['Errors & Reliability']) }}>
                                {page.categoryScores['Errors & Reliability']}
                            </div>
                        </div>
                    </div>

                    {page.issues.length > 0 && (
                        <div className="page-issue-preview">
                            <h4>Issues on this page ({page.issues.length})</h4>
                            {page.issues.map((issue, idx) => (
                                <IssueItem key={idx} issue={issue} />
                            ))}
                        </div>
                    )}
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

            {report.pages && report.pages.length > 0 && (
                <div className="pages-section">
                    <h2>Page Breakdown ({report.pages.length})</h2>
                    <div className="pages-list">
                        {[...report.pages].sort((a, b) => a.score - b.score).map((page, idx) => (
                            <PageAccordion key={idx} page={page} />
                        ))}
                    </div>
                </div>
            )}

            <div className="issues-section">
                <h2>Detailed Findings ({report.details.length})</h2>
                {report.details.length === 0 ? (
                    <div className="empty-state">No issues found! Great job.</div>
                ) : (
                    <div className="issues-list">
                        {([
                            'Performance',
                            'Accessibility',
                            'SEO',
                            'Responsiveness & Layout',
                            'Errors & Reliability',
                            'Best Practices'
                        ] as const).map(category => {
                            const categoryIssues = report.details.filter(issue => issue.category === category);
                            if (categoryIssues.length === 0) return null;

                            return (
                                <div key={category} className="category-group">
                                    <h3 className="category-header">
                                        {category}
                                        <span className="category-count-badge">{categoryIssues.length}</span>
                                    </h3>
                                    {categoryIssues.map((issue, idx) => (
                                        <IssueItem key={idx} issue={issue} />
                                    ))}
                                </div>
                            );
                        })}
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
        
        .pages-section {
            margin-bottom: 4rem;
        }

        .pages-section h2 {
            margin-bottom: 1.5rem;
            border-bottom: 1px solid var(--border);
            padding-bottom: 1rem;
        }

        .page-accordion {
            background: var(--bg-secondary);
            border-radius: var(--radius);
            margin-bottom: 1rem;
            border: 1px solid var(--border);
            overflow: hidden;
        }

        .page-header {
            padding: 1rem;
            display: flex;
            align-items: center;
            cursor: pointer;
            gap: 1rem;
            transition: background 0.2s;
        }
        .page-header:hover {
            background: rgba(255,255,255,0.02);
        }

        .page-score-badge {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 0.9rem;
            border: 2px solid currentColor;
        }

        .page-url {
            flex: 1;
            font-family: monospace;
            font-weight: 500;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .page-details {
            padding: 1.5rem;
            background: rgba(0,0,0,0.2);
            border-top: 1px solid var(--border);
        }

        .page-metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 1rem;
            margin-bottom: 1.5rem;
            padding-bottom: 1.5rem;
            border-bottom: 1px solid var(--border);
        }

        .metric-card {
            background: rgba(255,255,255,0.03);
            padding: 0.8rem;
            border-radius: 6px;
            text-align: center;
        }
        .metric-label {
            font-size: 0.75rem;
            color: var(--text-secondary);
            margin-bottom: 0.3rem;
            text-transform: uppercase;
        }
        .metric-value {
            font-weight: bold;
            font-size: 1.1rem;
        }

        .page-issue-preview {
            margin-top: 1rem;
        }
        .page-issue-preview h4 {
            font-size: 0.9rem;
            margin-bottom: 0.5rem;
            color: var(--text-secondary);
        }

        
        .category-group {
            margin-bottom: 2rem;
        }
        
        .category-header {
            font-size: 1.2rem;
            margin-bottom: 1rem;
            color: var(--text-primary);
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .category-count-badge {
            background: var(--bg-secondary);
            border: 1px solid var(--border);
            padding: 0.1rem 0.5rem;
            border-radius: 12px;
            font-size: 0.8rem;
            color: var(--text-secondary);
        }

        @keyframes progress {
            0% { stroke-dasharray: 0 100; }
        }
      `}</style>
        </div>
    );
};
