import React, { useState, useEffect, useRef } from 'react';

const PingTester = () => {
    const API_BASE = (
        window.location.protocol === 'file:' || 
        window.location.hostname.includes('github.io')
    ) ? 'http://127.0.0.1:5000' : '';
    const [host, setHost] = useState('8.8.8.8');
    const [count, setCount] = useState(4);
    const [timeout, setTimeoutVal] = useState(1);
    const [loading, setLoading] = useState(false);
    const [terminalLines, setTerminalLines] = useState([
        'Welcome to Network Ping Diagnostics Utility.',
        'Enter a host address above and click "테스트 시작" to begin.',
        'Ready.'
    ]);
    const [stats, setStats] = useState(null);
    const [error, setError] = useState('');
    
    // 브라우저 윈도우 스크롤 차단 및 내부 터미널 스크롤만 고정하기 위한 Ref
    const terminalContainerRef = useRef(null);

    const [presets, setPresets] = useState([
        { name: 'Google DNS', address: '8.8.8.8' },
        { name: 'Cloudflare DNS', address: '1.1.1.1' },
        { name: 'LGU+ DNS', address: '203.248.252.2' },
        { name: 'KT DNS', address: '168.126.63.1' }
    ]);

    const stopRef = useRef(false);
    const abortControllerRef = useRef(null);

    // 터미널 텍스트가 바뀔 때 브라우저 화면 전체가 움직이지 않고, 터미널 박스 내부 스크롤만 최하단으로 내림
    useEffect(() => {
        if (terminalContainerRef.current) {
            terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
        }
    }, [terminalLines]);

    const handleStop = () => {
        stopRef.current = true;
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        setLoading(false);
    };

    const handlePing = async () => {
        const trimmedHost = host.trim();
        if (!trimmedHost) {
            setError('호스트 이름 또는 IP 주소를 입력하세요.');
            return;
        }

        setError('');
        
        // stats의 Layout Shift 방지를 위해, null로 날리지 않고 Placeholder 구조 상태로 세팅
        setStats({
            sent: 0,
            received: 0,
            lost: 0,
            loss_rate: 0,
            min_time: null,
            avg_time: null,
            max_time: null,
            isPlaceholder: true // 플레이스홀더 상태
        });
        
        setLoading(true);
        stopRef.current = false;
        
        // 새로운 AbortController 초기화
        abortControllerRef.current = new AbortController();

        const isInfinite = count === 'infinite';
        const displayCount = isInfinite ? '무한' : count;

        setTerminalLines([
            `$ ping ${isInfinite ? '-t' : `-c ${count}`} ${trimmedHost}`,
            `Ping 테스트 시작 중... (전송 횟수: ${displayCount}회, 허용 시간: ${timeout}초)`,
            `Pinging ${trimmedHost} with 32 bytes of data:`
        ]);

        let sent = 0;
        let received = 0;
        let lost = 0;
        let rtts = [];

        try {
            while (!stopRef.current && (isInfinite || sent < count)) {
                const response = await fetch(`${API_BASE}/api/ping`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        host: trimmedHost,
                        count: 1,
                        timeout: timeout
                    }),
                    signal: abortControllerRef.current.signal // Abort signal 전달
                });

                if (stopRef.current) break;

                const data = await response.json();
                
                if (stopRef.current) break;

                sent += 1;
                if (response.ok && data.success) {
                    received += 1;
                    const rtt = data.stats && data.stats.avg_time !== null ? data.stats.avg_time : 10.0;
                    rtts.push(rtt);
                    
                    setTerminalLines(prev => {
                        const next = [
                            ...prev,
                            `Reply from ${trimmedHost}: bytes=32 time=${rtt.toFixed(2)}ms TTL=64`
                        ];
                        return next.slice(-30);
                    });
                } else {
                    lost += 1;
                    const errMsg = data.error || 'Request timed out.';
                    setTerminalLines(prev => {
                        const next = [
                            ...prev,
                            `Request timed out for ${trimmedHost} (${errMsg})`
                        ];
                        return next.slice(-30);
                    });
                }

                // 실시간 통계 계산 및 업데이트 (이때는 정식 결과 상태)
                const lossRate = Math.round((lost / sent) * 100);
                setStats({
                    sent,
                    received,
                    lost,
                    loss_rate: lossRate,
                    min_time: rtts.length > 0 ? Math.min(...rtts) : null,
                    avg_time: rtts.length > 0 ? Math.round((rtts.reduce((a, b) => a + b, 0) / rtts.length) * 10) / 10 : null,
                    max_time: rtts.length > 0 ? Math.max(...rtts) : null,
                    isPlaceholder: false
                });

                // 무한 핑이거나 아직 목표 횟수에 도달하지 않았고 멈추지 않았다면 1초 대기
                if (!stopRef.current && (isInfinite || sent < count)) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            
            const finalLossRate = sent > 0 ? Math.round((lost / sent) * 100) : 0;

            if (stopRef.current) {
                setTerminalLines(prev => {
                    const next = [
                        ...prev,
                        '',
                        `[SYSTEM] 사용자에 의해 핑 테스트가 중지되었습니다. (총 ${sent}회 전송)`
                    ];
                    return next.slice(-30);
                });
            } else {
                let diagnosticMsg = '';
                if (finalLossRate === 100) {
                    diagnosticMsg = `❌ [SYSTEM] 핑 테스트 완료: 대상 호스트로부터 응답이 없습니다. (연결 끊김)`;
                } else if (finalLossRate > 0) {
                    diagnosticMsg = `⚠️ [SYSTEM] 핑 테스트 완료: 일부 패킷 유실 발생. (응답 수신율 불안정: 손실률 ${finalLossRate}%)`;
                } else {
                    diagnosticMsg = `✔ [SYSTEM] 핑 테스트 완료: 응답 수신율 안정적. (손실률 0%)`;
                }

                setTerminalLines(prev => {
                    const next = [
                        ...prev,
                        '',
                        diagnosticMsg
                    ];
                    return next.slice(-30);
                });
            }
        } catch (err) {
            // AbortController 취소 시
            if (err.name === 'AbortError') {
                setTerminalLines(prev => {
                    const next = [
                        ...prev,
                        '',
                        `[SYSTEM] 사용자에 의해 핑 테스트가 즉시 중지되었습니다. (총 ${sent}회 전송)`
                    ];
                    return next.slice(-30);
                });
            } else {
                if (!stopRef.current) {
                    setError(err.message);
                    setTerminalLines(prev => {
                        const next = [
                            ...prev,
                            `❌ 에러 발생: ${err.message}`
                        ];
                        return next.slice(-30);
                    });
                }
            }
        } finally {
            setLoading(false);
            abortControllerRef.current = null;
        }
    };

    const handlePresetClick = (address) => {
        if (!loading) {
            setHost(address);
        }
    };

    return (
        <div className="calculator-container fade-in-enter">
            {/* 설정 카드 */}
            <div className="card">
                <div className="mb-6">
                    <h2 className="info-title" style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        📡 Ping 응답 및 지연 시간 테스트 (ICMP)
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                        대상 서버의 IP 또는 도메인을 입력하여 네트워크 연결 상태와 실시간 전송 지연 시간(Latency)을 측정합니다.
                    </p>
                    <p style={{ color: 'var(--highlight-yellow)', marginBottom: '1.5rem', fontSize: '0.85rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        ⚠️ 본 테스트 서버는 해외 리전(AWS 미국 버지니아 us-east-1 등)에서 구동됩니다.
                    </p>

                    {/* 프리셋 영역 */}
                    <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginRight: '0.5rem' }}>빠른 선택:</span>
                        {presets.map((preset, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => handlePresetClick(preset.address)}
                                disabled={loading}
                                style={{
                                    padding: '0.4rem 0.8rem',
                                    fontSize: '0.8rem',
                                    borderRadius: '20px',
                                    backgroundColor: host === preset.address ? 'rgba(0, 191, 255, 0.15)' : 'var(--bg-tertiary)',
                                    color: host === preset.address ? 'var(--accent)' : 'var(--text-secondary)',
                                    border: host === preset.address ? '1px solid var(--accent)' : '1px solid var(--border-color)',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s',
                                    fontWeight: '600'
                                }}
                            >
                                {preset.name} ({preset.address})
                            </button>
                        ))}
                    </div>

                    {/* 폼을 div로 대체하여 브라우저의 submit에 의한 페이지 스크롤 튐 차단 */}
                    <div className="flex gap-4 items-end" style={{ flexWrap: 'wrap' }}>
                        {/* 대상 호스트 */}
                        <div className="input-group" style={{ flexGrow: 3, minWidth: '250px' }}>
                            <label className="input-label">호스트 주소 (도메인 또는 IP)</label>
                            <input
                                type="text"
                                placeholder="예: 8.8.8.8 또는 google.com"
                                value={host}
                                onChange={(e) => setHost(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !loading) {
                                        handlePing();
                                    }
                                }}
                                className="input-highlight"
                                required
                                disabled={loading}
                            />
                        </div>

                        {/* 요청 횟수 */}
                        <div className="input-group" style={{ flexGrow: 1, minWidth: '100px' }}>
                            <label className="input-label">전송 횟수</label>
                            <select
                                value={count}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setCount(val === 'infinite' ? 'infinite' : parseInt(val));
                                }}
                                disabled={loading}
                                style={{ fontWeight: '700' }}
                            >
                                <option value="2">2회</option>
                                <option value="4">4회 (기본)</option>
                                <option value="6">6회</option>
                                <option value="8">8회</option>
                                <option value="10">10회</option>
                                <option value="infinite">무한 (지속)</option>
                            </select>
                        </div>

                        {/* 타임아웃 */}
                        <div className="input-group" style={{ flexGrow: 1, minWidth: '100px' }}>
                            <label className="input-label">허용 시간 (초)</label>
                            <select
                                value={timeout}
                                onChange={(e) => setTimeoutVal(parseInt(e.target.value))}
                                disabled={loading}
                                style={{ fontWeight: '700' }}
                            >
                                <option value="1">1초 (기본)</option>
                                <option value="2">2초</option>
                                <option value="3">3초</option>
                                <option value="4">4초</option>
                                <option value="5">5초</option>
                            </select>
                        </div>

                        {/* 실행 및 중지 버튼 */}
                        <button
                            type="button"
                            onClick={loading ? handleStop : handlePing}
                            style={{
                                padding: '1rem 2rem',
                                backgroundColor: loading ? '#ff453a' : 'var(--accent)',
                                color: loading ? '#fff' : 'var(--bg-primary)',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '1.1rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap'
                            }}
                            onMouseOver={(e) => { e.target.style.boxShadow = loading ? '0 0 10px rgba(255, 69, 58, 0.6)' : '0 0 10px var(--accent-glow)'; }}
                            onMouseOut={(e) => { e.target.style.boxShadow = 'none'; }}
                        >
                            {loading ? '테스트 중지' : '테스트 시작'}
                        </button>
                    </div>

                    {error && (
                        <div style={{
                            marginTop: '1.5rem', padding: '1rem',
                            backgroundColor: 'rgba(255, 69, 58, 0.1)',
                            color: '#ff453a', border: '1px solid #ff453a',
                            borderRadius: '6px', fontWeight: 'bold'
                        }}>
                            ❌ {error}
                        </div>
                    )}
                </div>
            </div>

            {/* 터미널 출력 및 통계 영역 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* 터미널 윈도우 (최대 높이 400px 고정 상태로 항시 렌더링) */}
                <div style={{
                    borderRadius: '10px',
                    overflow: 'hidden',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
                    border: '1px solid #333'
                }}>
                    {/* 터미널 타이틀바 */}
                    <div style={{
                        backgroundColor: '#222',
                        padding: '0.6rem 1rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid #333'
                    }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ff5f56', display: 'inline-block' }}></span>
                            <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ffbd2e', display: 'inline-block' }}></span>
                            <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#27c93f', display: 'inline-block' }}></span>
                        </div>
                        <span style={{ color: '#aaa', fontSize: '0.8rem', fontFamily: 'monospace', fontWeight: 'bold' }}>
                            Terminal - ping_diagnose@{host}
                        </span>
                        <span style={{ width: '40px' }}></span>
                    </div>

                    {/* 터미널 내용 */}
                    <div 
                        ref={terminalContainerRef}
                        className="ping-terminal-content"
                        style={{
                            backgroundColor: '#121212',
                            color: '#33ff33',
                            padding: '1.5rem',
                            fontFamily: '"Fira Code", "Courier New", Courier, monospace',
                            fontSize: '0.9rem',
                            height: '400px',
                            minHeight: '400px',
                            maxHeight: '400px',
                            overflowY: 'auto',
                            lineHeight: '1.4',
                            boxShadow: 'inset 0 0 10px rgba(0,0,0,0.8)'
                        }}
                    >
                        {terminalLines.map((line, idx) => (
                            <div 
                                key={idx} 
                                className="ping-terminal-line"
                                style={{ 
                                    whiteSpace: 'pre-wrap', 
                                    wordBreak: 'break-all',
                                    marginBottom: '0.4rem',
                                    color: line.startsWith('$') ? '#00bfff' : 
                                           line.startsWith('❌') || line.startsWith('[ERROR]') ? '#ff453a' : 
                                           line.startsWith('✔') || line.startsWith('[SYSTEM]') ? '#32cd32' : 
                                           line.startsWith('⚠️') ? '#ffbd2e' : '#33ff33'
                                }}
                            >
                                {line}
                            </div>
                        ))}
                        {loading && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ffbd2e', marginTop: '0.4rem' }}>
                                <span>Pinging...</span>
                                <span className="cursor-blink" style={{
                                    width: '8px',
                                    height: '15px',
                                    backgroundColor: '#ffbd2e',
                                    display: 'inline-block'
                                }}></span>
                            </div>
                        )}
                    </div>
                </div>

                {/* 통계 요약 (항상 고정 렌더링하여 Layout Shift 차단) */}
                <div className="card" style={{ 
                    borderLeft: `6px solid ${
                        !stats || stats.isPlaceholder ? 'var(--accent)' :
                        stats.loss_rate === 0 ? 'var(--highlight-green)' : 
                        stats.loss_rate === 100 ? '#ff453a' : 'var(--highlight-yellow)'
                    }`, 
                    padding: '1.5rem',
                    minHeight: '200px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                }}>
                    {!stats || stats.isPlaceholder ? (
                        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1rem 0' }}>
                            <h3 className="info-title" style={{ fontSize: '1.1rem', marginBottom: '0.8rem', color: 'var(--accent)' }}>
                                📊 실시간 진단 분석 통계
                            </h3>
                            <p style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
                                호스트 주소를 입력하고 <strong style={{ color: 'var(--accent)' }}>"테스트 시작"</strong> 버튼을 누르면,<br />
                                이곳에서 송수신 패킷 상태 및 RTT(왕복 시간) 지연 통계를 실시간으로 모니터링할 수 있습니다.
                            </p>
                        </div>
                    ) : (
                        <>
                            <h3 className="info-title" style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>
                                📊 분석 결과 요약 {loading && ' (실시간 업데이트)'}
                            </h3>
                            <div className="grid grid-cols-1 ping-results-grid gap-6">
                                {/* 패킷 정보 */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                    <div className="input-group">
                                        <span className="input-label">패킷 송수신 상태</span>
                                        <div className="input-display" style={{ minHeight: '3.5rem', padding: '0.5rem 1rem' }}>
                                            <div className="ping-stat-cols">
                                                <div className="ping-stat-col">
                                                    <span className="ping-stat-col-label">보냄</span>
                                                    <strong style={{ color: 'var(--accent)' }}>{stats.sent}</strong>
                                                </div>
                                                <div className="ping-stat-col-divider">|</div>
                                                <div className="ping-stat-col">
                                                    <span className="ping-stat-col-label">받음</span>
                                                    <strong style={{ color: 'var(--highlight-green)' }}>{stats.received}</strong>
                                                </div>
                                                <div className="ping-stat-col-divider">|</div>
                                                <div className="ping-stat-col">
                                                    <span className="ping-stat-col-label">손실</span>
                                                    <strong style={{ color: stats.lost > 0 ? '#ff453a' : 'var(--text-secondary)' }}>{stats.lost}</strong>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="input-group">
                                        <span className="input-label">패킷 손실률</span>
                                        <div className="input-display" style={{ minHeight: '3.5rem', fontSize: '1.1rem', color: stats.loss_rate === 0 ? 'var(--highlight-green)' : stats.loss_rate === 100 ? '#ff453a' : 'var(--highlight-yellow)', justifyContent: 'center' }}>
                                            {stats.loss_rate}% {stats.loss_rate === 0 ? '🟢 안정적' : stats.loss_rate === 100 ? '🔴 연결 끊김' : '🟡 불안정'}
                                        </div>
                                    </div>
                                </div>

                                {/* 지연 시간 */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                    <div className="input-group">
                                        <span className="input-label">응답 시간 (RTT)</span>
                                        <div className="input-display text-blue" style={{ minHeight: '3.5rem', padding: '0.5rem 1rem' }}>
                                            {stats.avg_time !== null ? (
                                                <div className="ping-stat-cols">
                                                    <div className="ping-stat-col">
                                                        <span className="ping-stat-col-label">최소</span>
                                                        <strong>{stats.min_time}ms</strong>
                                                    </div>
                                                    <div className="ping-stat-col-divider">|</div>
                                                    <div className="ping-stat-col">
                                                        <span className="ping-stat-col-label">평균</span>
                                                        <strong style={{ color: 'var(--highlight-blue)' }}>{stats.avg_time}ms</strong>
                                                    </div>
                                                    <div className="ping-stat-col-divider">|</div>
                                                    <div className="ping-stat-col">
                                                        <span className="ping-stat-col-label">최대</span>
                                                        <strong>{stats.max_time}ms</strong>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{ color: 'var(--text-secondary)', textAlign: 'center', width: '100%', fontSize: '0.9rem' }}>시간 정보 없음 (연결 무응답)</div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="input-group">
                                        <span className="input-label">현재 연결 상태</span>
                                        <div className="input-display" style={{ minHeight: '3.5rem', fontSize: '1.1rem', color: stats.received > 0 ? 'var(--highlight-green)' : '#ff453a', justifyContent: 'center' }}>
                                            {stats.received > 0 ? 'ONLINE' : 'OFFLINE'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* 설명 카드 */}
            <div className="card info-box" style={{ marginTop: '1.5rem' }}>
                <h3 className="info-title">Ping & ICMP 진단 설명</h3>
                <div className="info-grid">
                    <div className="info-item md-col-span-2">
                        <span className="info-label">원리 안내:</span>
                        <span>
                            Ping은 ICMP(Internet Control Message Protocol)의 Echo Request 메세지를 전송한 후, 대상으로부터 Echo Reply 수신 여부와 왕복 시간(RTT)을 측정하는 진단 도구입니다.
                        </span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">지연 시간(RTT):</span>
                        <span>
                            패킷이 출발지에서 목적지까지 도달했다가 다시 되돌아오는 데 걸린 시간입니다. 낮을수록 연결 반응 속도가 우수함을 뜻합니다. (보통 50ms 미만 매우 우수, 150ms 이상 반응 지연)
                        </span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">패킷 손실률:</span>
                        <span>
                            보낸 패킷 중 응답을 받지 못한 비율입니다. 0% 손실이 정상적인 네트워크이며, 조금이라도 패킷 손실이 발생하면 통신 단절, 지연, 파일 손상 등의 요인이 됩니다.
                        </span>
                    </div>
                </div>
            </div>

            {/* 애니메이션 스타일 키프레임 및 결과 그리드 커스텀 스타일 */}
            <style>{`
                @keyframes blink {
                    from, to { background-color: transparent }
                    50% { background-color: #ffbd2e }
                }
                .cursor-blink {
                    animation: blink 1s step-end infinite;
                }
                .ping-stat-cols {
                    display: flex;
                    width: 100%;
                    justify-content: space-around;
                    align-items: center;
                    font-family: monospace;
                    text-align: center;
                }
                .ping-stat-col {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 2px;
                    flex: 1;
                }
                .ping-stat-col-label {
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                    font-weight: normal;
                    text-transform: uppercase;
                }
                .ping-stat-col strong {
                    font-size: 1.05rem;
                }
                .ping-stat-col-divider {
                    color: var(--border-color);
                    opacity: 0.5;
                    font-weight: normal;
                    user-select: none;
                }
                @media (min-width: 768px) {
                    .ping-results-grid {
                        grid-template-columns: 4fr 6fr !important;
                    }
                }
                @media (max-width: 600px) {
                    .ping-terminal-content {
                        font-size: 0.78rem !important;
                        padding: 1rem !important;
                    }
                    .ping-terminal-line {
                        white-space: nowrap !important;
                        overflow-x: auto !important;
                        -webkit-overflow-scrolling: touch;
                        word-break: normal !important;
                    }
                    .ping-stat-col-label {
                        font-size: 0.7rem;
                    }
                    .ping-stat-col strong {
                        font-size: 0.95rem;
                    }
                }
            `}</style>
        </div>
    );
};

export default PingTester;

