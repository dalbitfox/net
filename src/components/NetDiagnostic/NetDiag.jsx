import React, { useState } from 'react';
import './NetDiag.css';
import DiagConfig from './DiagConfig';
import DiagStats from './DiagStats';
import DiagResults from './DiagResults';

const NetDiag = () => {
    const [targetNodes, setTargetNodes] = useState('');
    const [channelRange, setChannelRange] = useState('');
    const [protocol, setProtocol] = useState('tcp');
    const [isDiagnosing, setIsDiagnosing] = useState(false);
    const [results, setResults] = useState([]);
    const [error, setError] = useState('');
    const [progress, setProgress] = useState(0);

    const API_BASE = ''; // Proxy handles the base URL

    const runBatchDiag = async (targets, batchSize = 10) => {
        const total = targets.length;
        let processed = 0;
        let currentResults = [];

        for (let i = 0; i < total; i += batchSize) {
            // Check cancellation (not implemented, but good practice structure)

            const chunk = targets.slice(i, i + batchSize);
            try {
                const response = await fetch(`${API_BASE}/api/check_nodes`, {
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
                console.error('Batch diag error:', err);
                setError("서버 연결 실패(Batch): Python 서버가 실행 중인지 확인하세요.");
                break;
            }
        }
        setIsDiagnosing(false);
    };

    const handleDiag = async () => {
        if (!targetNodes || !channelRange) {
            setError('대상 노드와 채널 범위를 모두 입력해주세요.');
            return;
        }

        setIsDiagnosing(true);
        setResults([]);
        setError('');
        setProgress(0);

        try {
            // 1. Expand Targets
            const expandResponse = await fetch(`${API_BASE}/api/prepare_nodes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    target_nodes: targetNodes,
                    channel_range: channelRange,
                    protocol: protocol
                })
            });

            if (!expandResponse.ok) {
                const errData = await expandResponse.json();
                throw new Error(errData.error || 'Failed to initialize diagnostic');
            }

            const data = await expandResponse.json();
            const targets = data.targets || [];

            if (targets.length === 0) {
                throw new Error('진단 대상이 없습니다.');
            }

            if (targets.length > 1000) {
                if (!window.confirm(`주의: ${targets.length}개의 타겟을 진단합니다. 시간이 오래 걸릴 수 있습니다. 계속하시겠습니까?`)) {
                    setIsDiagnosing(false);
                    return;
                }
            }

            // 2. Start Batch Scan
            await runBatchDiag(targets, 15); // Batch size 15

        } catch (err) {
            setError(err.message);
            setIsDiagnosing(false);
        }
    };

    return (
        <div className="diag-wrapper">


            <DiagConfig
                targetNodes={targetNodes}
                setTargetNodes={setTargetNodes}
                channelRange={channelRange}
                setChannelRange={setChannelRange}
                protocol={protocol}
                setProtocol={setProtocol}
                onDiag={handleDiag}
                isDiagnosing={isDiagnosing}
            />

            {error && (
                <div className="error-message">
                    <span>⚠</span> {error}
                </div>
            )}

            {/* Progress Bar */}
            {isDiagnosing && (
                <div className="progress-container">
                    <div className="progress-header">
                        <span>진단 진행 중...</span>
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
                    <DiagStats results={results} />
                    <DiagResults results={results} />
                </>
            )}
        </div>
    );
};

export default NetDiag;
