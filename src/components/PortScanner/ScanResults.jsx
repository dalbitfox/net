import React, { useState } from 'react';

const ScanResults = ({ results }) => {
    const [showOpenOnly, setShowOpenOnly] = useState(false);

    const filteredResults = showOpenOnly
        ? results.filter(r => r.state.includes('open'))
        : results;

    return (
        <div className="results-section" style={{ display: results.length > 0 ? 'block' : 'none', animation: 'fadeIn 0.5s ease' }}>
            <div className="panel-header" style={{ justifyContent: 'space-between', borderBottom: 'none' }}>
                <h2 className="panel-title" style={{ fontSize: '1.3rem', color: 'var(--text-primary)' }}>
                    스캔 결과 <span style={{
                        background: 'var(--accent-green)',
                        color: 'var(--bg-primary)',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        marginLeft: '10px'
                    }}>{filteredResults.length}</span>
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                        type="checkbox"
                        id="showOpenOnly"
                        checked={showOpenOnly}
                        onChange={(e) => setShowOpenOnly(e.target.checked)}
                        style={{ accentColor: 'var(--accent-green)', width: '18px', height: '18px' }}
                    />
                    <label htmlFor="showOpenOnly" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>열린 포트만 보기</label>
                </div>
            </div>

            <div className="results-table-container">
                <table className="results-table">
                    <thead>
                        <tr>
                            <th>IP 주소</th>
                            <th>포트</th>
                            <th>프로토콜</th>
                            <th>상태</th>
                            <th>서비스</th>
                            <th>배너</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredResults.map((r, index) => (
                            <tr key={index}>
                                <td>{r.ip}</td>
                                <td>{r.port}</td>
                                <td>
                                    <span style={{
                                        color: r.protocol === 'tcp' ? 'var(--accent-cyan)' : 'var(--accent-magenta)',
                                        fontWeight: 'bold',
                                        textTransform: 'uppercase',
                                        fontSize: '0.8rem'
                                    }}>
                                        {r.protocol}
                                    </span>
                                </td>
                                <td>
                                    <span className={`status-badge ${r.state.includes('open') ? 'open' : r.state === 'filtered' ? 'filtered' : 'closed'}`}>
                                        {r.state.toUpperCase()}
                                    </span>
                                </td>
                                <td style={{ color: 'var(--accent-cyan)' }}>{r.service || '-'}</td>
                                <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{r.banner || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ScanResults;
