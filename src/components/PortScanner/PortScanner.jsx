import React, { useState } from 'react';
import './PortScanner.css';
import ScanConfig from './ScanConfig';
import ScanStats from './ScanStats';
import ScanResults from './ScanResults';

const PortScanner = () => {
    const [targets, setTargets] = useState('');
    const [ports, setPorts] = useState('');
    const [protocol, setProtocol] = useState('tcp');
    const [isScanning, setIsScanning] = useState(false);
    const [results, setResults] = useState([]);
    const [error, setError] = useState('');
    const [progress, setProgress] = useState(0);

    const API_BASE = ''; // Proxy handles the base URL

    const runBatchScan = async (targetList, batchSize = 10) => {
        const total = targetList.length;
        let processed = 0;
        let currentResults = [];

        for (let i = 0; i < total; i += batchSize) {
            // Check cancellation (not implemented, but good practice structure)

            const chunk = targetList.slice(i, i + batchSize);
            try {
                const response = await fetch(`${API_BASE}/api/scan_ports`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ targets: chunk })
                });

                if (!response.ok) throw new Error('Network response was not ok');

                const data = await response.json();
                if (data.results) {
                    currentResults = [...currentResults, ...data.results];
                    setResults(prev => [...prev, ...data.results]);
                }

                processed += chunk.length;
                const percent = Math.min(100, Math.round((processed / total) * 100));
                setProgress(percent);

            } catch (err) {
                console.error('Batch scan error:', err);
                setError("서버 연결 실패(Batch): Python 서버가 실행 중인지 확인하세요.");
                break;
            }
        }
        setIsScanning(false);
    };

    const handleScan = async () => {
        if (!targets || !ports) {
            setError('대상 IP와 포트 범위를 모두 입력해주세요.');
            return;
        }

        setIsScanning(true);
        setResults([]);
        setError('');
        setProgress(0);

        try {
            // 1. Expand Targets
            const expandResponse = await fetch(`${API_BASE}/api/prepare_scan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targets: targets,
                    ports: ports,
                    protocol: protocol
                })
            });

            if (!expandResponse.ok) {
                const errData = await expandResponse.json();
                throw new Error(errData.error || 'Failed to initialize diagnostic');
            }

            const data = await expandResponse.json();
            const targetList = data.targets || [];

            if (targetList.length === 0) {
                throw new Error('스캔 대상이 없습니다.');
            }

            if (targetList.length > 1000) {
                if (!window.confirm(`주의: ${targetList.length}개의 타겟을 스캔합니다. 시간이 오래 걸릴 수 있습니다. 계속하시겠습니까?`)) {
                    setIsScanning(false);
                    return;
                }
            }

            // 2. Start Batch Scan
            await runBatchScan(targetList, 15); // Batch size 15

        } catch (err) {
            setError(err.message);
            setIsScanning(false);
        }
    };

    return (
        <div className="diag-wrapper">


            <ScanConfig
                targets={targets}
                setTargets={setTargets}
                ports={ports}
                setPorts={setPorts}
                protocol={protocol}
                setProtocol={setProtocol}
                onScan={handleScan}
                isScanning={isScanning}
            />

            {error && (
                <div className="error-message">
                    <span>⚠</span> {error}
                </div>
            )}

            {/* Progress Bar */}
            {isScanning && (
                <div className="progress-container">
                    <div className="progress-header">
                        <span>스캔 진행 중...</span>
                        <span>{progress}%</span>
                    </div>
                    <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
            )}

            {/* Results */}
            {results.length > 0 && (
                <>
                    <ScanStats results={results} />
                    <ScanResults results={results} />
                </>
            )}
        </div>
    );
};

export default PortScanner;
