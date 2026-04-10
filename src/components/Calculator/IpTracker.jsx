import React, { useState } from 'react';

const IpTracker = () => {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    const handleSearch = async (e) => {
        e.preventDefault();
        const trimmedQuery = query.trim();
        if (!trimmedQuery) {
            setError('검색어를 입력해주세요.');
            return;
        }

        setLoading(true);
        setError('');
        setResult(null);

        try {
            const response = await fetch(`/api/whois?query=${encodeURIComponent(trimmedQuery)}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'API 요청 실패');
            }

            // 공공데이터 API 에러 처리
            const root = data.response;
            if (root?.result?.result_code && root.result.result_code !== "10000") {
                const msg = root.result.result_msg || '알 수 없는 오류';
                throw new Error(`${msg} (에러코드: ${root.result.result_code})`);
            }

            setResult(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const extractInfo = () => {
        if (!result?.response?.whois) return null;
        
        const whois = result.response.whois;
        const infoList = [];

        if (whois.krdomain) {
            const d = whois.krdomain;
            infoList.push({ label: '도메인 이름', value: d.name });
            infoList.push({ label: '등록인', value: d.regName });
            infoList.push({ label: '등록일자', value: d.regDate });
            infoList.push({ label: '최종수정일자', value: d.lastUpdatedDate });
            infoList.push({ label: '만료일자', value: d.endDate });
            infoList.push({ label: '주소', value: d.addr, fullWidth: true });
            infoList.push({ label: '네임서버', value: d.ns1 || '알 수 없음' });
        }
        else if (whois.queryType && whois.queryType.includes('IP')) {
            infoList.push({ label: '조회 IP', value: whois.query });
            infoList.push({ label: 'IP 타입', value: whois.queryType });
            infoList.push({ label: '레지스트리', value: whois.registry });
            infoList.push({ label: '국가 코드', value: whois.countryCode });
            
            if (whois.korean) {
                const piInfo = whois.korean.PI?.netInfo;
                if (piInfo) {
                    infoList.push({ label: '기관(ISP) 이름', value: piInfo.orgName });
                    infoList.push({ label: 'IP 대역', value: piInfo.range });
                    infoList.push({ label: '할당 일자', value: piInfo.regDate });
                    infoList.push({ label: '주소', value: piInfo.addr, fullWidth: true });
                }
                
                const userInfo = whois.korean.user?.netInfo;
                if (userInfo) {
                    infoList.push({ label: '사용자 네트워크 이름', value: userInfo.orgName });
                    infoList.push({ label: '사용자 주소', value: userInfo.addr, fullWidth: true });
                }
            }
        }
        else if (whois.queryType === 'ASN') {
            infoList.push({ label: 'AS 번호', value: whois.query });
            infoList.push({ label: '레지스트리', value: whois.registry });
            infoList.push({ label: '국가 코드', value: whois.countryCode });
            
            if (whois.korean) {
                const asName = whois.korean.asName;
                const orgInfo = whois.korean.orgInfo;
                
                infoList.push({ label: 'AS 이름', value: asName });
                if (orgInfo) {
                    infoList.push({ label: '기관 이름', value: orgInfo.name });
                    infoList.push({ label: '주소', value: orgInfo.addr, fullWidth: true });
                }
            }
        } else {
            infoList.push({ label: '조회 타입', value: whois.queryType || 'Unknown' });
            infoList.push({ label: '조회 결과', value: '상세 정보가 없습니다.' });
        }

        return infoList;
    };

    const parsedInfo = extractInfo();

    return (
        <div className="calculator-container fade-in-enter">
            <div className="card">
                <div className="mb-6">
                    <h2 className="info-title" style={{ fontSize: '1.4rem' }}>
                        IP & 도메인 정보 추적 (Whois)
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                        도메인 이름 (.kr, .한국), IP 주소 (IPv4, IPv6), AS 번호를 입력하여 할당 정보를 실시간으로 조회합니다. 해외 도메인(.com, .net)은 지원하지 않습니다.
                    </p>

                    <form onSubmit={handleSearch} className="flex gap-4 items-center" style={{ flexWrap: 'wrap' }}>
                        <div className="input-group" style={{ flexGrow: 1, minWidth: '300px' }}>
                            <label className="input-label">추적 대상 입력</label>
                            <input
                                type="text"
                                placeholder="예: 202.30.50.51, kisa.or.kr, AS9700"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="input-highlight"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                marginTop: '1.5rem',
                                padding: '1rem 2rem',
                                backgroundColor: 'var(--accent)',
                                color: 'var(--bg-primary)',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '1.1rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                ...(loading ? { opacity: 0.7, cursor: 'not-allowed' } : {})
                            }}
                            onMouseOver={(e) => e.target.style.boxShadow = '0 0 10px var(--accent-glow)'}
                            onMouseOut={(e) => e.target.style.boxShadow = 'none'}
                        >
                            {loading ? '검색 중...' : '검색'}
                        </button>
                    </form>
                    
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

                {parsedInfo && (
                    <div className="card" style={{ marginTop: '2rem', borderTop: '2px solid var(--highlight-blue)' }}>
                        <h3 className="info-title" style={{ marginBottom: '1rem' }}>
                            상세 조회 결과
                        </h3>
                        <div className="grid grid-cols-1 md-grid-cols-2 gap-6">
                            {parsedInfo.map((item, idx) => (
                                <div key={idx} className={`input-group ${item.fullWidth ? 'md-col-span-2' : ''}`}>
                                    <label className="input-label">{item.label}</label>
                                    <div className="input-display text-blue">
                                        {item.value || '-'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            
            <div className="card info-box">
                <h3 className="info-title">서비스 이용 안내</h3>
                <div className="info-grid">
                    <div className="info-item md-col-span-2">
                        <span className="info-label">데이터 출처:</span>
                        <span>공공데이터포털 (한국인터넷진흥원_인터넷주소 정보 검색)</span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">지원 대상:</span>
                        <span>IPv4/IPv6, 국내 도메인 (.kr, .한국), AS번호</span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">조회 제한:</span>
                        <span>초당 최대 트랜잭션 800 tps, 실시간 데이터(5초 주기 갱신)</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IpTracker;
