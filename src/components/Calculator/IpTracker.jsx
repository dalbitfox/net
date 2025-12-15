import React, { useState } from 'react';

const IpTracker = () => {
    const [query, setQuery] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [useProxy, setUseProxy] = useState(false);

    const handleSearch = async () => {
        if (!query) {
            setError('IP 주소 또는 도메인을 입력해주세요.');
            return;
        }
        if (!apiKey) {
            setError('API Key를 입력해주세요.');
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);

        // KISA Whois API Endpoint (HTTPS enforced)
        const baseUrl = 'https://apis.data.go.kr/B551505/whois/internet_address';

        // Proxy URL (Cors-anywhere demo)
        const proxyUrl = 'https://cors-anywhere.herokuapp.com/';

        const queryParams = `?serviceKey=${encodeURIComponent(apiKey)}&query=${encodeURIComponent(query)}&answer=json`;

        const finalUrl = useProxy ? proxyUrl + baseUrl + queryParams : baseUrl + queryParams;

        try {
            console.log("Requesting:", finalUrl);
            const response = await fetch(finalUrl, {
                method: 'GET',
                headers: useProxy ? {
                    'Origin': window.location.origin
                } : {}
            });

            if (!response.ok) {
                if (response.status === 403 || response.status === 0) {
                    throw new Error('CORS 오류 또는 접근 권한이 없습니다. 프록시 모드를 켜보세요.');
                }
                throw new Error(`서버 오류: ${response.status}`);
            }

            const data = await response.json();
            console.log("Response:", data);

            // Handle KISA specific response structure
            if (data.response && data.response.result) {
                setResult(data.response.result); // result object usually has items
            } else if (data.whois) {
                setResult(data.whois);
            } else {
                setResult(data);
            }

        } catch (err) {
            console.error(err);
            setError(err.message + (useProxy ? '' : ' (CORS 에러가 발생했다면 프록시 모드를 사용해보세요)'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="calculator-container">
            <div className="card">
                <h2 className="text-2xl font-bold mb-6 text-center" style={{ color: 'var(--accent)' }}>IP / 도메인 추적 (Whois)</h2>

                {/* Input Area */}
                <div className="grid grid-cols-1 gap-6 mb-6">
                    <div className="input-group">
                        <label className="input-label">인증키 (API Key)</label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="공공데이터포털에서 발급받은 Decoding Key 입력"
                            className="input-highlight font-mono"
                        />
                        <p className="text-xs text-white/50 mt-1">
                            ※ data.go.kr의 '한국인터넷진흥원 후이즈 조회' 서비스 키가 필요합니다.
                        </p>
                    </div>

                    <div className="input-group">
                        <label className="input-label">IP 주소 또는 도메인</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="예: 202.30.50.51 또는 kisa.or.kr"
                                className="input-highlight font-mono flex-1"
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            />
                            <button
                                onClick={handleSearch}
                                disabled={loading}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white font-bold disabled:opacity-50 transition-colors"
                            >
                                {loading ? '조회 중...' : '조회'}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="useProxy"
                            checked={useProxy}
                            onChange={(e) => setUseProxy(e.target.checked)}
                            className="w-4 h-4"
                        />
                        <label htmlFor="useProxy" className="text-sm text-white/80 select-none cursor-pointer">
                            CORS 우회 모드 (프록시 사용) - 조회 실패 시 체크하세요
                        </label>
                    </div>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="p-4 mb-6 bg-red-500/20 border border-red-500/50 rounded text-red-200">
                        🚨 {error}
                    </div>
                )}

                {/* Result Display */}
                {result && (
                    <div className="card info-box" style={{ borderTop: '4px solid var(--accent)' }}>
                        <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--accent)' }}>조회 결과</h3>
                        <div className="font-mono text-sm leading-relaxed p-4 rounded bg-black/20 overflow-auto">
                            <pre className="whitespace-pre-wrap text-white/90">
                                {JSON.stringify(result, null, 2)}
                            </pre>
                            {/* Only show nicely formatted fields if common structure exists, otherwise dump JSON */}
                        </div>
                    </div>
                )}

                {!result && !loading && !error && (
                    <div className="text-center text-white/30 py-10">
                        IP 주소나 도메인을 입력하여 등록 정보를 조회해보세요.
                    </div>
                )}
            </div>
        </div>
    );
};

export default IpTracker;
