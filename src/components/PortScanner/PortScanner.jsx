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
            let offset = 0;
            const batchSize = 15;
            let hasMore = true;
            let totalTargets = 0;

            while (hasMore) {
                // EDR Bypass: 페이로드를 Base64로 난독화
                const rawPayload = JSON.stringify({
                    t: targets,
                    p: ports,
                    pr: protocol,
                    idx: offset,
                    sz: batchSize
                });
                const encodedPayload = btoa(rawPayload);

                const response = await fetch(`${API_BASE}/api/diag_session`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ q: encodedPayload })
                });

                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.error || 'Network response was not ok');
                }

                const data = await response.json();
                if (data.error) throw new Error(data.error);

                // 응답 디코딩
                const decodedStr = atob(data.d);
                const resultData = JSON.parse(decodedStr);

                if (offset === 0) {
                    totalTargets = resultData.total || 0;
                    if (totalTargets === 0) {
                        throw new Error('스캔 대상이 없습니다.');
                    }
                    if (totalTargets > 1000) {
                        if (!window.confirm(`주의: ${totalTargets}개의 타겟을 스캔합니다. 계속하시겠습니까?`)) {
                            setIsScanning(false);
                            return;
                        }
                    }
                }

                if (resultData.results && resultData.results.length > 0) {
                    setResults(prev => [...prev, ...resultData.results]);
                }

                offset += batchSize;
                const percent = Math.min(100, Math.round((Math.min(offset, totalTargets) / totalTargets) * 100));
                setProgress(percent);

                if (offset >= totalTargets) {
                    hasMore = false;
                }
            }
        } catch (err) {
            console.error('Scan error:', err);
            setError(err.message || "서버 연결 실패: Python 서버가 실행 중인지 확인하세요.");
        } finally {
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
