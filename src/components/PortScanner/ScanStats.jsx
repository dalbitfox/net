import React from 'react';

const ScanStats = ({ results }) => {
    const total = results.length;
    const open = results.filter(r => r.state.includes('open')).length;
    const closed = results.filter(r => r.state === 'closed').length;
    const filtered = results.filter(r => r.state === 'filtered').length;

    return (
        <div className="stats-grid">
            <div className="stat-card total">
                <div className="stat-value">{total}</div>
                <div className="stat-label">총 스캔</div>
            </div>
            <div className="stat-card open">
                <div className="stat-value">{open}</div>
                <div className="stat-label">열림 (Open)</div>
            </div>
            <div className="stat-card closed">
                <div className="stat-value">{closed}</div>
                <div className="stat-label">닫힘 (Closed)</div>
            </div>
            <div className="stat-card filtered">
                <div className="stat-value">{filtered}</div>
                <div className="stat-label">필터링됨 (Filtered)</div>
            </div>
        </div>
    );
};

export default ScanStats;
