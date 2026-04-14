import React from 'react';
import { presets } from './portPresets';

const ScanConfig = ({
    targets, setTargets,
    ports, setPorts,
    protocol, setProtocol,
    onScan, isScanning
}) => {

    const handlePresetClick = (preset) => {
        setPorts(preset.ports);
        setProtocol(preset.protocol);
    };

    return (
        <div className="control-panel">
            <div className="panel-header">
                <svg className="panel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 24, height: 24, color: 'var(--accent-cyan)' }}>
                    <circle cx="12" cy="12" r="10" />
                    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                <span className="panel-title">스캔 정보 입력</span>
            </div>

            <div className="form-grid">
                <div className="form-group">
                    <label className="form-label">대상 IP</label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="예: 192.168.1.1 또는 /24"
                        value={targets}
                        onChange={(e) => setTargets(e.target.value)}
                        disabled={isScanning}
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">포트 범위</label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="예: 22,80,443 또는 1-1000"
                        value={ports}
                        onChange={(e) => setPorts(e.target.value)}
                        disabled={isScanning}
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">통신 방식</label>
                    <div className="protocol-selector">
                        <button
                            className={`protocol-btn ${protocol === 'tcp' ? 'active' : ''}`}
                            onClick={() => setProtocol('tcp')}
                            disabled={isScanning}
                        >
                            TCP
                        </button>
                        <button
                            className={`protocol-btn udp ${protocol === 'udp' ? 'active' : ''}`}
                            onClick={() => setProtocol('udp')}
                            disabled={isScanning}
                        >
                            UDP
                        </button>
                    </div>
                </div>
            </div>

            <div className="preset-section">
                <div className="form-label">빠른 프리셋</div>
                <div className="preset-grid">
                    {presets.map((preset, index) => (
                        <div
                            key={index}
                            className="preset-chip"
                            onClick={() => !isScanning && handlePresetClick(preset)}
                            style={{ opacity: isScanning ? 0.5 : 1, cursor: isScanning ? 'not-allowed' : 'pointer' }}
                        >
                            {preset.label} <span>{preset.display}</span>
                        </div>
                    ))}
                </div>
            </div>

            <button
                className={`scan-button ${isScanning ? 'scanning' : ''}`}
                onClick={onScan}
                disabled={isScanning}
            >
                {isScanning ? '⟳ 스캔 진행 중...' : '▶ 스캔 시작'}
            </button>
        </div>
    );
};

export default ScanConfig;
