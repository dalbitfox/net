import React, { useState, useEffect } from 'react';

const IpTracker = () => {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [showRawText, setShowRawText] = useState(false);
    const [activeLang, setActiveLang] = useState('ko'); // 'ko' or 'en' for bilingual view (ASN / IP)
    const [clientInfo, setClientInfo] = useState(null);

    useEffect(() => {
        const fetchClientInfo = async () => {
            let publicIpData = null;
            
            // 1. 프론트엔드에서 공인 IP 및 기본 정보 조회 시도 (ipwho.is)
            try {
                const ipwhoisRes = await fetch('https://ipwho.is/');
                if (ipwhoisRes.ok) {
                    const data = await ipwhoisRes.json();
                    if (data.success) {
                        publicIpData = data;
                    }
                }
            } catch (err) {
                console.warn("Failed to fetch public IP from ipwho.is:", err);
            }

            // 2. 백엔드 API 호출 시도 (공인 IP 전달하여 KISA 대역 정보 및 로컬 사설 IP 결합)
            try {
                const ipParam = publicIpData?.ip ? `?ip=${encodeURIComponent(publicIpData.ip)}` : '';
                const response = await fetch(`/api/client-info${ipParam}`);
                if (response.ok) {
                    const data = await response.json();
                    setClientInfo(data);
                    return; // 성공 시 종료
                } else {
                    throw new Error("Backend API returned non-ok status");
                }
            } catch (err) {
                console.warn("Backend API not available, using client-side fallback data:", err);
            }

            // 3. 백엔드가 죽었거나 배포 환경(GitHub Pages)인 경우, 이미 조회한 ipwho.is 데이터로 프론트엔드 노출
            if (publicIpData) {
                setClientInfo({
                    ip: publicIpData.ip,
                    countryCode: publicIpData.country_code || 'KR',
                    asn: publicIpData.asn || '',
                    isp: publicIpData.isp || publicIpData.org || '',
                    announcements: publicIpData.asn ? [publicIpData.ip] : [],
                    privateIp: null
                });
            }
        };
        fetchClientInfo();
    }, []);

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
        setShowRawText(false);

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

    // WHOIS JSON 데이터를 포맷팅하여 원본 텍스트 스타일로 출력하는 함수
    const getFormattedRawText = () => {
        if (!result?.response?.whois) return '';
        
        const whois = result.response.whois;
        const lines = [];
        lines.push("%kwhois");
        lines.push("#");
        lines.push("# KISA Whois Query Service");
        lines.push("#");
        lines.push("");

        if (whois.krdomain) {
            const d = whois.krdomain;
            lines.push(`Domain Name:             ${d.name || '-'}`);
            lines.push(`Registrant:              ${d.regName || '-'}`);
            if (d.e_regName) lines.push(`Registrant (English):    ${d.e_regName}`);
            lines.push(`Registrar (Agency):      ${d.agency || '-'}`);
            if (d.agency_url) lines.push(`Registrar URL:           ${d.agency_url}`);
            lines.push(`Registration Date:       ${d.regDate || '-'}`);
            lines.push(`Expiration Date:         ${d.endDate || '-'}`);
            lines.push(`Last Updated Date:       ${d.lastUpdatedDate || '-'}`);
            lines.push(`DNSSEC:                  ${d.dnssec || 'unsigned'}`);
            
            if (d.domainStatus) {
                const status = Array.isArray(d.domainStatus) ? d.domainStatus : [d.domainStatus];
                status.forEach(s => {
                    lines.push(`Domain Status:           ${s}`);
                });
            }
            
            lines.push("");
            lines.push("[ Registrant Address ]");
            lines.push(`Address:                 ${d.addr || '-'}`);
            if (d.e_addr) lines.push(`Address (English):       ${d.e_addr}`);
            lines.push(`Postal Code:             ${d.post || '-'}`);
            
            lines.push("");
            lines.push("[ Administrative Contact ]");
            lines.push(`Admin Name:              ${d.adminName || '-'}`);
            if (d.e_adminName) lines.push(`Admin Name (English):    ${d.e_adminName}`);
            lines.push(`Admin Email:             ${d.adminEmail || '-'}`);
            lines.push(`Admin Phone:             ${d.adminPhone || '-'}`);
            
            if (d.ns && d.ns.length > 0) {
                lines.push("");
                lines.push("[ Name Servers ]");
                d.ns.forEach((nsServer, idx) => {
                    const ipAddr = d.ip && d.ip[idx] ? d.ip[idx] : '-';
                    lines.push(`Name Server:             ${nsServer} (${ipAddr})`);
                });
            }
        } else if (whois.queryType && whois.queryType.includes('IP')) {
            lines.push(`Query:                   ${whois.query || '-'}`);
            lines.push(`Query Type:              ${whois.queryType || '-'}`);
            lines.push(`Registry:                ${whois.registry || '-'}`);
            lines.push(`Country Code:            ${whois.countryCode || '-'}`);
            
            const renderNetBlock = (block, label) => {
                if (!block) return;
                lines.push("");
                lines.push(`[ ${label} Network Info ]`);
                if (block.netinfo) {
                    lines.push(`Range:                   ${block.netinfo.range || '-'}`);
                    lines.push(`Prefix:                  ${block.netinfo.prefix || '-'}`);
                    lines.push(`Org Name:                ${block.netinfo.orgName || '-'}`);
                    lines.push(`Org ID:                  ${block.netinfo.orgID || '-'}`);
                    if (block.netinfo.servName) lines.push(`Service Name:            ${block.netinfo.servName}`);
                    if (block.netinfo.netType) lines.push(`Network Type:            ${block.netinfo.netType}`);
                    lines.push(`Address:                 ${block.netinfo.addr || '-'}`);
                    lines.push(`Zip Code:                ${block.netinfo.zipCode || '-'}`);
                    lines.push(`Reg Date:                ${block.netinfo.regDate || '-'}`);
                }
                if (block.techContact) {
                    lines.push(`Tech Name:               ${block.techContact.name || '-'}`);
                    lines.push(`Tech Phone:              ${block.techContact.phone || '-'}`);
                    lines.push(`Tech Email:              ${block.techContact.email || '-'}`);
                }
            };

            if (whois.korean) {
                renderNetBlock(whois.korean.PI, 'KRNIC PI/ISP (Korean)');
                renderNetBlock(whois.korean.user, 'End User (Korean)');
            }
            if (whois.english) {
                renderNetBlock(whois.english.PI, 'KRNIC PI/ISP (English)');
                renderNetBlock(whois.english.user, 'End User (English)');
            }
        } else if (whois.queryType === 'ASN') {
            lines.push(`Query:                   ${whois.query || '-'}`);
            lines.push(`Query Type:              ${whois.queryType || '-'}`);
            lines.push(`Registry:                ${whois.registry || '-'}`);
            lines.push(`Country Code:            ${whois.countryCode || '-'}`);
            
            const renderASNBlock = (block, label) => {
                if (!block) return;
                lines.push("");
                lines.push(`[ ${label} ]`);
                lines.push(`AS Number:               ${block.asn || '-'}`);
                lines.push(`AS Name:                 ${block.asName || '-'}`);
                if (block.orgInfo) {
                    lines.push(`Org Name:                ${block.orgInfo.name || '-'}`);
                    lines.push(`Org Address:             ${block.orgInfo.addr || '-'}`);
                    lines.push(`Zip Code:                ${block.orgInfo.zipCode || '-'}`);
                }
                if (block.techContact) {
                    lines.push(`Tech Name:               ${block.techContact.name || '-'}`);
                    lines.push(`Tech Phone:              ${block.techContact.phone || '-'}`);
                    lines.push(`Tech Email:              ${block.techContact.email || '-'}`);
                }
            };

            renderASNBlock(whois.korean, 'KRNIC ASN Info (Korean)');
            renderASNBlock(whois.english, 'KRNIC ASN Info (English)');
        }

        const kisaText = lines.join("\n");
        if (whois.rdap?.rawText) {
            if (kisaText) {
                return `${kisaText}\n\n======================================================================\n🌐 GLOBAL RDAP DATA (APNIC/ARIN/RIPE)\n======================================================================\n\n${whois.rdap.rawText}`;
            }
            return whois.rdap.rawText;
        }
        return kisaText;
    };

    const formatRegDate = (val) => {
        if (!val) return '-';
        if (val.length === 8) {
            // YYYYMMDD -> YYYY. MM. DD.
            return `${val.substring(0, 4)}. ${val.substring(4, 6)}. ${val.substring(6, 8)}.`;
        }
        return val;
    };

    const renderDomainResult = (d) => {
        const statuses = d.domainStatus ? (Array.isArray(d.domainStatus) ? d.domainStatus : [d.domainStatus]) : [];
        const nsList = d.ns || [];
        const ipList = d.ip || [];
        const nsPairs = nsList.map((nsName, idx) => ({
            ns: nsName,
            ip: ipList[idx] || '-'
        }));

        return (
            <div className="whois-card-grid fade-in-enter">
                {/* 1. 도메인 기본 정보 카드 */}
                <div className="card">
                    <h3 className="whois-section-title">도메인 기본 등록 정보</h3>
                    <div className="grid grid-cols-1 gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                        <div className="whois-grid-item">
                            <span className="whois-grid-label">도메인 이름</span>
                            <span className="whois-grid-value text-blue monospace">{d.name || '-'}</span>
                        </div>
                        <div className="whois-grid-item">
                            <span className="whois-grid-label">등록인 (국문)</span>
                            <span className="whois-grid-value">{d.regName || '-'}</span>
                        </div>
                        <div className="whois-grid-item">
                            <span className="whois-grid-label">등록인 (영문)</span>
                            <span className="whois-grid-value">{d.e_regName || '-'}</span>
                        </div>
                        <div className="whois-grid-item">
                            <span className="whois-grid-label">등록대행자 (Registrar)</span>
                            <span className="whois-grid-value">
                                {d.agency_url ? (
                                    <a href={d.agency_url} target="_blank" rel="noopener noreferrer" className="text-blue" style={{ textDecoration: 'underline' }}>
                                        {d.agency || '-'}
                                    </a>
                                ) : (
                                    d.agency || '-'
                                )}
                            </span>
                        </div>
                        <div className="whois-grid-item">
                            <span className="whois-grid-label">등록일자</span>
                            <span className="whois-grid-value monospace">{d.regDate || '-'}</span>
                        </div>
                        <div className="whois-grid-item">
                            <span className="whois-grid-label">만료일자</span>
                            <span className="whois-grid-value monospace">{d.endDate || '-'}</span>
                        </div>
                        <div className="whois-grid-item">
                            <span className="whois-grid-label">최종수정일자</span>
                            <span className="whois-grid-value monospace">{d.lastUpdatedDate || '-'}</span>
                        </div>
                        <div className="whois-grid-item">
                            <span className="whois-grid-label">정보공개여부</span>
                            <span className="whois-grid-value monospace">
                                <span className={`whois-badge ${d.infoYN === 'Y' ? 'badge-kr' : ''}`}>{d.infoYN || '-'}</span>
                            </span>
                        </div>
                    </div>
                </div>

                {/* 2. 관리자 및 주소 정보 카드 */}
                <div className="card">
                    <h3 className="whois-section-title">책임자 및 기관 주소 정보</h3>
                    <div className="grid grid-cols-1 gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                        <div className="whois-grid-item">
                            <span className="whois-grid-label">관리자 이름 (국문/영문)</span>
                            <span className="whois-grid-value">
                                {d.adminName || '-'} {d.e_adminName ? `(${d.e_adminName})` : ''}
                            </span>
                        </div>
                        <div className="whois-grid-item">
                            <span className="whois-grid-label">관리자 이메일</span>
                            <span className="whois-grid-value monospace">{d.adminEmail || '-'}</span>
                        </div>
                        <div className="whois-grid-item">
                            <span className="whois-grid-label">관리자 전화번호</span>
                            <span className="whois-grid-value monospace">{d.adminPhone || '-'}</span>
                        </div>
                        <div className="whois-grid-item">
                            <span className="whois-grid-label">우편번호</span>
                            <span className="whois-grid-value monospace">{d.post || '-'}</span>
                        </div>
                        <div className="whois-col-span-2 whois-grid-item">
                            <span className="whois-grid-label">기관 주소 (국문)</span>
                            <span className="whois-grid-value">{d.addr || '-'}</span>
                        </div>
                        {d.e_addr && (
                            <div className="whois-col-span-2 whois-grid-item">
                                <span className="whois-grid-label">기관 주소 (영문)</span>
                                <span className="whois-grid-value">{d.e_addr}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. 기술 정보 & 네임서버 매핑 리스트 */}
                <div className="card whois-col-span-2">
                    <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: '1rem', borderBottom: '1px dashed var(--border-color)', paddingBottom: '0.4rem', marginBottom: '1rem' }}>
                        <h3 className="whois-section-title" style={{ borderBottom: 'none', margin: 0, padding: 0 }}>네임서버 및 시스템 정보</h3>
                        <div className="flex gap-2">
                            <span className="whois-badge badge-kr">DNSSEC: {d.dnssec || 'unsigned'}</span>
                            {statuses.map((stat, i) => (
                                <span key={i} className="whois-badge" style={{ color: 'var(--highlight-yellow)' }}>
                                    {stat}
                                </span>
                            ))}
                        </div>
                    </div>

                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.8rem' }}>
                        해당 도메인을 호스팅하고 있는 네임서버의 목록과 각각의 IP 주소 매핑 정보입니다.
                    </p>

                    {nsPairs.length > 0 ? (
                        <div className="whois-detail-table-wrapper">
                            <table className="whois-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '80px' }}>번호</th>
                                        <th>네임서버 호스트명 (Name Server)</th>
                                        <th>연결 IP 주소 (IP Address)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {nsPairs.map((pair, idx) => (
                                        <tr key={idx}>
                                            <td style={{ fontWeight: 'bold' }}>{idx + 1}</td>
                                            <td className="text-blue">{pair.ns}</td>
                                            <td>{pair.ip}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                            등록된 네임서버 정보가 없습니다.
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderIpBlockDetails = (block, title) => {
        if (!block?.netinfo) return null;
        const info = block.netinfo;
        const contact = block.techContact || {};

        return (
            <div className="card">
                <h3 className="whois-section-title">{title}</h3>
                <div className="grid grid-cols-1 gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                    <div className="whois-grid-item">
                        <span className="whois-grid-label">할당 IP 대역</span>
                        <span className="whois-grid-value text-blue monospace">{info.range || '-'}</span>
                    </div>
                    <div className="whois-grid-item">
                        <span className="whois-grid-label">프리픽스 (Prefix)</span>
                        <span className="whois-grid-value text-blue monospace">{info.prefix || '-'}</span>
                    </div>
                    <div className="whois-grid-item">
                        <span className="whois-grid-label">기관이름</span>
                        <span className="whois-grid-value">{info.orgName || '-'}</span>
                    </div>
                    <div className="whois-grid-item">
                        <span className="whois-grid-label">기관 ID</span>
                        <span className="whois-grid-value monospace">{info.orgID || '-'}</span>
                    </div>
                    {info.servName && (
                        <div className="whois-grid-item">
                            <span className="whois-grid-label">연결서비스 이름</span>
                            <span className="whois-grid-value">{info.servName}</span>
                        </div>
                    )}
                    {info.netType && (
                        <div className="whois-grid-item">
                            <span className="whois-grid-label">네트워크 유형</span>
                            <span className="whois-grid-value monospace">{info.netType}</span>
                        </div>
                    )}
                    <div className="whois-grid-item">
                        <span className="whois-grid-label">할당 등록일자</span>
                        <span className="whois-grid-value monospace">{formatRegDate(info.regDate)}</span>
                    </div>
                    <div className="whois-grid-item">
                        <span className="whois-grid-label">우편번호</span>
                        <span className="whois-grid-value monospace">{info.zipCode || '-'}</span>
                    </div>
                    <div className="whois-col-span-2 whois-grid-item">
                        <span className="whois-grid-label">주소</span>
                        <span className="whois-grid-value">{info.addr || '-'}</span>
                    </div>

                    {/* 담당자 서브 섹션 */}
                    <div className="whois-col-span-2" style={{ borderTop: '1px dashed var(--border-color)', marginTop: '0.5rem', paddingTop: '0.8rem' }}>
                        <span className="whois-grid-label" style={{ marginBottom: '0.5rem', display: 'block' }}>네트워크 관리 담당자</span>
                        <div className="grid grid-cols-1 md-grid-cols-3 gap-4">
                            <div className="whois-grid-item">
                                <span className="whois-grid-label" style={{ fontSize: '0.75rem' }}>이름</span>
                                <span className="whois-grid-value" style={{ fontSize: '0.95rem' }}>{contact.name || '-'}</span>
                            </div>
                            <div className="whois-grid-item">
                                <span className="whois-grid-label" style={{ fontSize: '0.75rem' }}>전화번호</span>
                                <span className="whois-grid-value monospace" style={{ fontSize: '0.95rem' }}>{contact.phone || '-'}</span>
                            </div>
                            <div className="whois-grid-item">
                                <span className="whois-grid-label" style={{ fontSize: '0.75rem' }}>이메일 주소</span>
                                <span className="whois-grid-value monospace" style={{ fontSize: '0.95rem' }}>
                                    {contact.email ? (
                                        <a href={`mailto:${contact.email}`} className="text-blue" style={{ textDecoration: 'underline' }}>
                                            {contact.email}
                                        </a>
                                    ) : '-'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderKrIpResult = (whois) => {
        const activeBlock = activeLang === 'ko' ? whois.korean : whois.english;
        if (!activeBlock) return <div className="card">정보를 불러오는 데 실패했습니다.</div>;

        // 통신사(ISP) 및 주요 요약 정보 추출
        const piBlock = whois.korean?.PI || whois.english?.PI;
        const userBlock = whois.korean?.user || whois.english?.user;
        const ispName = piBlock?.netinfo?.orgName || userBlock?.netinfo?.orgName || '-';
        const servName = piBlock?.netinfo?.servName || userBlock?.netinfo?.servName ? ` (${piBlock?.netinfo?.servName || userBlock?.netinfo?.servName})` : '';
        const ispFull = `${ispName}${servName}`;

        const rdap = whois.rdap || null;

        return (
            <div className="flex flex-col gap-6 fade-in-enter">
                {/* 국내 IP 안내 배너 (통신사 정보 강조) */}
                <div style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    color: 'var(--highlight-green)',
                    padding: '1.2rem',
                    borderRadius: '6px',
                    marginBottom: '0.5rem'
                }}>
                    <div className="whois-warning-title" style={{ color: 'var(--highlight-green)', fontWeight: '700', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        🇰🇷 국내 인터넷주소 안내 (Korean IP Address Information)
                    </div>
                    <p style={{ fontSize: '0.9rem', lineHeight: '1.6', margin: 0, color: 'var(--text-primary)' }}>
                        조회하신 IP 주소(<b>{whois.query}</b>)는 한국인터넷진흥원(KISA/KRNIC)에서 관리하는 대한민국 IP 주소 대역입니다.<br />
                        인터넷 서비스 제공자(통신사/ISP): <b style={{ color: 'var(--highlight-green)', fontSize: '1.05rem' }}>{ispFull}</b>
                    </p>
                </div>

                {/* 언어 선택 및 요약 헤더 */}
                <div className="flex justify-between items-center" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    <div className="flex gap-2">
                        <span className="whois-badge badge-kr">조회 대상: {whois.query}</span>
                        <span className="whois-badge">종류: {whois.queryType}</span>
                        <span className="whois-badge">레지스트리: {whois.registry}</span>
                        <span className="whois-badge badge-kr">통신사: {ispName}</span>
                    </div>
                    <div style={{ display: 'flex', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                        <button
                            onClick={() => setActiveLang('ko')}
                            style={{
                                border: 'none', padding: '0.3rem 0.8rem', cursor: 'pointer', fontSize: '0.85rem',
                                backgroundColor: activeLang === 'ko' ? 'var(--accent)' : 'var(--bg-secondary)',
                                color: activeLang === 'ko' ? 'var(--bg-primary)' : 'var(--text-primary)',
                                fontWeight: activeLang === 'ko' ? 'bold' : 'normal'
                            }}
                        >
                            국문 정보
                        </button>
                        <button
                            onClick={() => setActiveLang('en')}
                            style={{
                                border: 'none', padding: '0.3rem 0.8rem', cursor: 'pointer', fontSize: '0.85rem',
                                backgroundColor: activeLang === 'en' ? 'var(--accent)' : 'var(--bg-secondary)',
                                color: activeLang === 'en' ? 'var(--bg-primary)' : 'var(--text-primary)',
                                fontWeight: activeLang === 'en' ? 'bold' : 'normal'
                            }}
                        >
                            영문 정보 (English)
                        </button>
                    </div>
                </div>

                <div className="whois-card-grid">
                    {/* PI/ISP 할당 정보 */}
                    {activeBlock.PI && renderIpBlockDetails(activeBlock.PI, `${activeLang === 'ko' ? 'ISP / 할당 대행 기관 정보 (KISA)' : 'ISP Allocation Provider Info (KISA)'}`)}
                    
                    {/* 최종 사용자 할당 정보 */}
                    {activeBlock.user && renderIpBlockDetails(activeBlock.user, `${activeLang === 'ko' ? '최종 사용자 기관 정보 (User Network)' : 'End User Organization Info'}`)}
                </div>

                {/* 글로벌 RDAP 정보 추가 표시 (해외 IP 처럼 대량 정보 제공) */}
                {rdap && (
                    <div className="flex flex-col gap-4" style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                            🌏 글로벌 WHOIS 등록 정보 (APNIC RDAP)
                        </h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                            아시아태평양 인터넷관리기구(APNIC) 데이터베이스에 등록된 글로벌 범위 정보입니다. KISA 세부 정보와 비교하여 확인하실 수 있습니다.
                        </p>
                        
                        <div className="whois-card-grid">
                            {/* 글로벌 기본 정보 */}
                            <div className="card">
                                <h3 className="whois-section-title">글로벌 등록 대역 정보</h3>
                                <div className="grid grid-cols-1 gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                                    <div className="whois-grid-item">
                                        <span className="whois-grid-label">할당 IP 대역</span>
                                        <span className="whois-grid-value text-blue monospace">{rdap.netRange || whois.query}</span>
                                    </div>
                                    <div className="whois-grid-item">
                                        <span className="whois-grid-label">CIDR 접두사</span>
                                        <span className="whois-grid-value text-blue monospace">{rdap.cidr || '-'}</span>
                                    </div>
                                    <div className="whois-grid-item">
                                        <span className="whois-grid-label">네트워크 이름</span>
                                        <span className="whois-grid-value monospace">{rdap.netName || '-'}</span>
                                    </div>
                                    <div className="whois-grid-item">
                                        <span className="whois-grid-label">관리 핸들 (Handle)</span>
                                        <span className="whois-grid-value monospace">{rdap.netHandle || '-'}</span>
                                    </div>
                                    <div className="whois-grid-item">
                                        <span className="whois-grid-label">네트워크 유형</span>
                                        <span className="whois-grid-value monospace">{rdap.netType || '-'}</span>
                                    </div>
                                    <div className="whois-grid-item">
                                        <span className="whois-grid-label">소속 상위 핸들 (Parent)</span>
                                        <span className="whois-grid-value monospace">{rdap.parent || '-'}</span>
                                    </div>
                                    {rdap.regDate && (
                                        <div className="whois-grid-item">
                                            <span className="whois-grid-label">최초 등록일자</span>
                                            <span className="whois-grid-value monospace">{rdap.regDate}</span>
                                        </div>
                                    )}
                                    {rdap.updatedDate && (
                                        <div className="whois-grid-item">
                                            <span className="whois-grid-label">최종 갱신일자</span>
                                            <span className="whois-grid-value monospace">{rdap.updatedDate}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 소유 기관 정보 */}
                            <div className="card">
                                <h3 className="whois-section-title">소유 및 관리 기관 정보 (Registrant)</h3>
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="whois-grid-item">
                                        <span className="whois-grid-label">기관 명칭 (Organization)</span>
                                        <span className="whois-grid-value" style={{ fontWeight: 'bold' }}>{rdap.orgName || '-'}</span>
                                    </div>
                                    <div className="whois-grid-item">
                                        <span className="whois-grid-label">기관 고유 ID</span>
                                        <span className="whois-grid-value monospace">{rdap.orgId || '-'}</span>
                                    </div>
                                    {rdap.orgAddress && (
                                        <div className="whois-grid-item">
                                            <span className="whois-grid-label">기관 등록 주소 (Address)</span>
                                            <span className="whois-grid-value">{rdap.orgAddress}</span>
                                        </div>
                                    )}
                                    <div className="whois-grid-item">
                                        <span className="whois-grid-label">국가 코드</span>
                                        <span className="whois-badge badge-foreign" style={{ width: 'fit-content' }}>
                                            {whois.countryCode || 'KR'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* 연락처 정보 */}
                            {(rdap.abuseContact?.email || rdap.techContact?.email) && (
                                <div className="card whois-col-span-2">
                                    <h3 className="whois-section-title">글로벌 기관 비상/기술 연락처</h3>
                                    <div className="grid grid-cols-1 md-grid-cols-2 gap-6">
                                        {rdap.abuseContact?.email && (
                                            <div style={{ background: 'rgba(255,255,255,0.01)', padding: '1rem', borderRadius: '6px', border: '1px dashed var(--border-color)' }}>
                                                <span className="whois-grid-label" style={{ color: 'var(--highlight-yellow)', marginBottom: '0.5rem', display: 'block' }}>
                                                    ⚠️ 남용/해킹 신고 연락처 (Abuse Contact)
                                                </span>
                                                <div className="flex flex-col gap-2">
                                                    <div className="info-item">
                                                        <span className="info-label">이름</span>
                                                        <span>{rdap.abuseContact.name || '-'}</span>
                                                    </div>
                                                    <div className="info-item">
                                                        <span className="info-label">전화번호</span>
                                                        <span className="monospace">{rdap.abuseContact.phone || '-'}</span>
                                                    </div>
                                                    <div className="info-item">
                                                        <span className="info-label">이메일</span>
                                                        <span className="monospace text-blue" style={{ textDecoration: 'underline' }}>
                                                            <a href={`mailto:${rdap.abuseContact.email}`}>{rdap.abuseContact.email}</a>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        
                                        {rdap.techContact?.email && (
                                            <div style={{ background: 'rgba(255,255,255,0.01)', padding: '1rem', borderRadius: '6px', border: '1px dashed var(--border-color)' }}>
                                                <span className="whois-grid-label" style={{ color: 'var(--highlight-blue)', marginBottom: '0.5rem', display: 'block' }}>
                                                    ⚙️ 기술 지원 담당자 (Tech Contact)
                                                </span>
                                                <div className="flex flex-col gap-2">
                                                    <div className="info-item">
                                                        <span className="info-label">이름</span>
                                                        <span>{rdap.techContact.name || '-'}</span>
                                                    </div>
                                                    <div className="info-item">
                                                        <span className="info-label">전화번호</span>
                                                        <span className="monospace">{rdap.techContact.phone || '-'}</span>
                                                    </div>
                                                    <div className="info-item">
                                                        <span className="info-label">이메일</span>
                                                        <span className="monospace text-blue" style={{ textDecoration: 'underline' }}>
                                                            <a href={`mailto:${rdap.techContact.email}`}>{rdap.techContact.email}</a>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderForeignIpResult = (whois) => {
        const rdap = whois.rdap || {};
        
        return (
            <div className="flex flex-col gap-6 fade-in-enter">
                {/* 해외 IP 안내 경고 배너 */}
                <div className="whois-warning-banner">
                    <div className="whois-warning-title">
                        🌐 해외 인터넷주소 안내 (Foreign IP Address Information)
                    </div>
                    <p style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
                        조회하신 IP 주소({whois.query})는 한국인터넷진흥원(KISA)이 아닌 해외 관리 기관(<b>{whois.registry || '해외 레지스트리'}</b>)에서 관리하고 있습니다.<br />
                        KISA 오픈 API 규격에 따라 기본 정보만 표시되며, 보다 정확한 Whois 내역 확인은 해당 대륙별 등록 대행기관 링크를 활용하시기 바랍니다.
                    </p>
                    <div className="whois-warning-links">
                        <a href="https://www.arin.net" target="_blank" rel="noopener noreferrer" className="whois-link-btn">
                            ARIN (북미)
                        </a>
                        <a href="http://wq.apnic.net/apnic-bin/whois.pl" target="_blank" rel="noopener noreferrer" className="whois-link-btn">
                            APNIC (아시아/태평양)
                        </a>
                        <a href="https://apps.db.ripe.net/db-web-ui/query" target="_blank" rel="noopener noreferrer" className="whois-link-btn">
                            RIPE NCC (유럽)
                        </a>
                        <a href="http://lacnic.net/cgi-bin/lacnic/whois?lg=EN" target="_blank" rel="noopener noreferrer" className="whois-link-btn">
                            LACNIC (중남미)
                        </a>
                        <a href="http://afrinic.net" target="_blank" rel="noopener noreferrer" className="whois-link-btn">
                            AFRINIC (아프리카)
                        </a>
                    </div>
                </div>

                <div className="whois-card-grid">
                    {/* 기본 정보 */}
                    <div className="card">
                        <h3 className="whois-section-title">글로벌 등록 대역 정보</h3>
                        <div className="grid grid-cols-1 gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                            <div className="whois-grid-item">
                                <span className="whois-grid-label">할당 IP 대역</span>
                                <span className="whois-grid-value text-blue monospace">{rdap.netRange || whois.query}</span>
                            </div>
                            <div className="whois-grid-item">
                                <span className="whois-grid-label">CIDR 접두사</span>
                                <span className="whois-grid-value text-blue monospace">{rdap.cidr || '-'}</span>
                            </div>
                            <div className="whois-grid-item">
                                <span className="whois-grid-label">네트워크 이름</span>
                                <span className="whois-grid-value monospace">{rdap.netName || '-'}</span>
                            </div>
                            <div className="whois-grid-item">
                                <span className="whois-grid-label">관리 핸들 (Handle)</span>
                                <span className="whois-grid-value monospace">{rdap.netHandle || '-'}</span>
                            </div>
                            <div className="whois-grid-item">
                                <span className="whois-grid-label">네트워크 유형</span>
                                <span className="whois-grid-value monospace">{rdap.netType || '-'}</span>
                            </div>
                            <div className="whois-grid-item">
                                <span className="whois-grid-label">소속 상위 핸들 (Parent)</span>
                                <span className="whois-grid-value monospace">{rdap.parent || '-'}</span>
                            </div>
                            <div className="whois-grid-item">
                                <span className="whois-grid-label">최초 등록일자</span>
                                <span className="whois-grid-value monospace">{rdap.regDate || '-'}</span>
                            </div>
                            <div className="whois-grid-item">
                                <span className="whois-grid-label">최종 갱신일자</span>
                                <span className="whois-grid-value monospace">{rdap.updatedDate || '-'}</span>
                            </div>
                        </div>
                    </div>

                    {/* 소유 기관 정보 */}
                    <div className="card">
                        <h3 className="whois-section-title">소유 및 관리 기관 정보 (Registrant)</h3>
                        <div className="grid grid-cols-1 gap-4">
                            <div className="whois-grid-item">
                                <span className="whois-grid-label">기관 명칭 (Organization)</span>
                                <span className="whois-grid-value" style={{ fontWeight: 'bold' }}>{rdap.orgName || '-'}</span>
                            </div>
                            <div className="whois-grid-item">
                                <span className="whois-grid-label">기관 고유 ID</span>
                                <span className="whois-grid-value monospace">{rdap.orgId || '-'}</span>
                            </div>
                            <div className="whois-grid-item">
                                <span className="whois-grid-label">기관 등록 주소 (Address)</span>
                                <span className="whois-grid-value">{rdap.orgAddress || '-'}</span>
                            </div>
                            <div className="whois-grid-item">
                                <span className="whois-grid-label">국가 코드</span>
                                <span className="whois-badge badge-foreign" style={{ width: 'fit-content' }}>
                                    {whois.countryCode || '-'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 연락처 정보 */}
                    {(rdap.abuseContact?.email || rdap.techContact?.email) && (
                        <div className="card whois-col-span-2">
                            <h3 className="whois-section-title">해외 기관 비상/기술 연락처</h3>
                            <div className="grid grid-cols-1 md-grid-cols-2 gap-6">
                                {rdap.abuseContact?.email && (
                                    <div style={{ background: 'rgba(255,255,255,0.01)', padding: '1rem', borderRadius: '6px', border: '1px dashed var(--border-color)' }}>
                                        <span className="whois-grid-label" style={{ color: 'var(--highlight-yellow)', marginBottom: '0.5rem', display: 'block' }}>
                                            ⚠️ 남용/해킹 신고 연락처 (Abuse Contact)
                                        </span>
                                        <div className="flex flex-col gap-2">
                                            <div className="info-item">
                                                <span className="info-label">이름</span>
                                                <span>{rdap.abuseContact.name || '-'}</span>
                                            </div>
                                            <div className="info-item">
                                                <span className="info-label">전화번호</span>
                                                <span className="monospace">{rdap.abuseContact.phone || '-'}</span>
                                            </div>
                                            <div className="info-item">
                                                <span className="info-label">이메일</span>
                                                <span className="monospace text-blue" style={{ textDecoration: 'underline' }}>
                                                    <a href={`mailto:${rdap.abuseContact.email}`}>{rdap.abuseContact.email}</a>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                {rdap.techContact?.email && (
                                    <div style={{ background: 'rgba(255,255,255,0.01)', padding: '1rem', borderRadius: '6px', border: '1px dashed var(--border-color)' }}>
                                        <span className="whois-grid-label" style={{ color: 'var(--highlight-blue)', marginBottom: '0.5rem', display: 'block' }}>
                                            ⚙️ 기술 지원 담당자 (Tech Contact)
                                        </span>
                                        <div className="flex flex-col gap-2">
                                            <div className="info-item">
                                                <span className="info-label">이름</span>
                                                <span>{rdap.techContact.name || '-'}</span>
                                            </div>
                                            <div className="info-item">
                                                <span className="info-label">전화번호</span>
                                                <span className="monospace">{rdap.techContact.phone || '-'}</span>
                                            </div>
                                            <div className="info-item">
                                                <span className="info-label">이메일</span>
                                                <span className="monospace text-blue" style={{ textDecoration: 'underline' }}>
                                                    <a href={`mailto:${rdap.techContact.email}`}>{rdap.techContact.email}</a>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderAsnResult = (whois) => {
        const activeBlock = activeLang === 'ko' ? whois.korean : whois.english;
        if (!activeBlock) return <div className="card">ASN 정보를 파싱할 수 없습니다.</div>;

        return (
            <div className="flex flex-col gap-6 fade-in-enter">
                {/* 언어 선택 및 요약 헤더 */}
                <div className="flex justify-between items-center" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    <div className="flex gap-2">
                        <span className="whois-badge badge-kr">AS 번호: {whois.query}</span>
                        <span className="whois-badge">레지스트리: {whois.registry}</span>
                        <span className="whois-badge badge-kr">국가코드: {whois.countryCode}</span>
                    </div>
                    <div style={{ display: 'flex', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                        <button
                            onClick={() => setActiveLang('ko')}
                            style={{
                                border: 'none', padding: '0.3rem 0.8rem', cursor: 'pointer', fontSize: '0.85rem',
                                backgroundColor: activeLang === 'ko' ? 'var(--accent)' : 'var(--bg-secondary)',
                                color: activeLang === 'ko' ? 'var(--bg-primary)' : 'var(--text-primary)',
                                fontWeight: activeLang === 'ko' ? 'bold' : 'normal'
                            }}
                        >
                            국문 정보
                        </button>
                        <button
                            onClick={() => setActiveLang('en')}
                            style={{
                                border: 'none', padding: '0.3rem 0.8rem', cursor: 'pointer', fontSize: '0.85rem',
                                backgroundColor: activeLang === 'en' ? 'var(--accent)' : 'var(--bg-secondary)',
                                color: activeLang === 'en' ? 'var(--bg-primary)' : 'var(--text-primary)',
                                fontWeight: activeLang === 'en' ? 'bold' : 'normal'
                            }}
                        >
                            영문 정보 (English)
                        </button>
                    </div>
                </div>

                <div className="whois-card-grid">
                    {/* ASN 정보 */}
                    <div className="card">
                        <h3 className="whois-section-title">AS 고유 정보</h3>
                        <div className="grid grid-cols-1 gap-4">
                            <div className="whois-grid-item">
                                <span className="whois-grid-label">Autonomous System Number</span>
                                <span className="whois-grid-value text-blue monospace" style={{ fontSize: '1.2rem' }}>{activeBlock.asn || whois.query}</span>
                            </div>
                            <div className="whois-grid-item">
                                <span className="whois-grid-label">AS 식별 이름 (AS Name)</span>
                                <span className="whois-grid-value text-blue monospace">{activeBlock.asName || '-'}</span>
                            </div>
                        </div>
                    </div>

                    {/* 소유 기관 정보 */}
                    <div className="card">
                        <h3 className="whois-section-title">AS 소유 기관 정보</h3>
                        {activeBlock.orgInfo ? (
                            <div className="grid grid-cols-1 gap-4">
                                <div className="whois-grid-item">
                                    <span className="whois-grid-label">기관 이름</span>
                                    <span className="whois-grid-value" style={{ fontWeight: 'bold' }}>{activeBlock.orgInfo.name || '-'}</span>
                                </div>
                                <div className="whois-grid-item">
                                    <span className="whois-grid-label">우편번호</span>
                                    <span className="whois-grid-value monospace">{activeBlock.orgInfo.zipCode || '-'}</span>
                                </div>
                                <div className="whois-grid-item">
                                    <span className="whois-grid-label">기관 주소</span>
                                    <span className="whois-grid-value">{activeBlock.orgInfo.addr || '-'}</span>
                                </div>
                            </div>
                        ) : (
                            <div style={{ padding: '1rem 0', color: 'var(--text-secondary)' }}>기관 정보 세부 사항이 없습니다.</div>
                        )}
                    </div>

                    {/* 기술 담당자 */}
                    {activeBlock.techContact && (
                        <div className="card whois-col-span-2">
                            <h3 className="whois-section-title">AS 기술 관리 담당자 (Technical Contact)</h3>
                            <div className="grid grid-cols-1 md-grid-cols-3 gap-4">
                                <div className="whois-grid-item">
                                    <span className="whois-grid-label">담당자명</span>
                                    <span className="whois-grid-value">{activeBlock.techContact.name || '-'}</span>
                                </div>
                                <div className="whois-grid-item">
                                    <span className="whois-grid-label">전화번호</span>
                                    <span className="whois-grid-value monospace">{activeBlock.techContact.phone || '-'}</span>
                                </div>
                                <div className="whois-grid-item">
                                    <span className="whois-grid-label">이메일 주소</span>
                                    <span className="whois-grid-value monospace text-blue" style={{ textDecoration: 'underline' }}>
                                        {activeBlock.techContact.email ? (
                                            <a href={`mailto:${activeBlock.techContact.email}`}>{activeBlock.techContact.email}</a>
                                        ) : '-'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderResultSection = () => {
        if (!result?.response?.whois) return null;
        const whois = result.response.whois;

        // 국내 IP 판정 (registry가 KRNIC이거나 countryCode가 KR이거나 korean/english 데이터 블록이 있는 경우)
        const isKoreanIp = whois.queryType && whois.queryType.includes('IP') && 
            (whois.registry === 'KRNIC' || whois.countryCode === 'KR' || whois.korean || whois.english);
        const isForeignIp = whois.queryType && whois.queryType.includes('IP') && !isKoreanIp;

        return (
            <div style={{ marginTop: '2rem' }}>
                <div className="flex justify-between items-center mb-4" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                    <h3 className="info-title" style={{ fontSize: '1.2rem', marginBottom: 0 }}>
                        🔍 상세 검색 결과
                    </h3>
                    <button
                        onClick={() => setShowRawText(!showRawText)}
                        className="whois-terminal-toggle"
                        style={{ marginTop: 0 }}
                    >
                        {showRawText ? '📊 구조화된 카드로 보기' : '💻 원본 WHOIS 텍스트 보기'}
                    </button>
                </div>

                {showRawText ? (
                    <div className="fade-in-enter">
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                            질의어: <span className="monospace" style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{whois.query || query}</span> | 레지스트리 제공 원본 형식 데이터
                        </div>
                        <div className="whois-terminal-box">
                            {getFormattedRawText()}
                        </div>
                    </div>
                ) : (
                    <>
                        {whois.krdomain && renderDomainResult(whois.krdomain)}
                        {whois.queryType && whois.queryType.includes('IP') && !isForeignIp && renderKrIpResult(whois)}
                        {isForeignIp && renderForeignIpResult(whois)}
                        {whois.queryType === 'ASN' && renderAsnResult(whois)}
                    </>
                )}
            </div>
        );
    };

    return (
        <div className="calculator-container fade-in-enter">
            <div className="card">
                <div className="mb-6">
                    <h2 className="info-title" style={{ fontSize: '1.4rem' }}>
                        IP & 도메인 정보 추적 (Whois)
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                        도메인 이름 (.kr, .한국), IP 주소 (IPv4, IPv6), AS 번호를 입력하여 상세 등록/할당 대역 정보, 관리 네트워크 주소 및 담당자 정보 등을 실시간으로 조회합니다.
                    </p>

                    {/* Hurricane Electric BGP Toolkit 스타일 접속 정보 */}
                    {clientInfo && (
                        <div style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            padding: '1.5rem',
                            marginBottom: '2rem',
                            fontSize: '1rem',
                            lineHeight: '1.8',
                            color: 'var(--text-primary)',
                            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)'
                        }}>
                            <div style={{ fontSize: '1.15rem', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                                Welcome to the Hurricane Electric BGP Toolkit (NetBox Edition).
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <span>You are visiting from&nbsp;</span>
                                    <span style={{ fontWeight: 'bold', textDecoration: 'underline', color: 'var(--accent)', fontFamily: 'monospace' }}>{clientInfo.ip}</span>
                                    {clientInfo.countryCode && (
                                        <img 
                                            src={`https://flagcdn.com/w20/${clientInfo.countryCode.toLowerCase()}.png`} 
                                            alt={clientInfo.countryCode} 
                                            style={{
                                                marginLeft: '0.5rem',
                                                border: '1px solid var(--text-primary)',
                                                height: '13px',
                                                display: 'inline-block',
                                                verticalAlign: 'middle'
                                            }}
                                        />
                                    )}
                                </div>

                                {clientInfo.privateIp && (
                                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <span>Your LAN/Private IP is&nbsp;</span>
                                        <span style={{ fontWeight: 'bold', textDecoration: 'underline', color: '#ff453a', fontFamily: 'monospace' }}>{clientInfo.privateIp}</span>
                                        <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            border: '1px solid #ff453a',
                                            borderRadius: '3px',
                                            padding: '0.05rem 0.25rem',
                                            fontSize: '0.7rem',
                                            marginLeft: '0.5rem',
                                            backgroundColor: 'rgba(255, 69, 58, 0.1)',
                                            color: '#ff453a',
                                            fontWeight: 'bold',
                                            verticalAlign: 'middle'
                                        }}>
                                            LAN / PRIVATE
                                        </span>
                                    </div>
                                )}

                                {clientInfo.announcements && clientInfo.announcements.map((cidr, idx) => (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <span>Announced as&nbsp;</span>
                                        <span style={{ fontWeight: 'bold', textDecoration: 'underline', color: 'var(--accent)', fontFamily: 'monospace' }}>{cidr}</span>
                                        {clientInfo.countryCode && (
                                            <img 
                                                src={`https://flagcdn.com/w20/${clientInfo.countryCode.toLowerCase()}.png`} 
                                                alt={clientInfo.countryCode} 
                                                style={{
                                                    marginLeft: '0.5rem',
                                                    border: '1px solid var(--text-primary)',
                                                    height: '13px',
                                                    display: 'inline-block',
                                                    verticalAlign: 'middle'
                                                }}
                                            />
                                        )}
                                    </div>
                                ))}

                                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', marginTop: '0.3rem' }}>
                                    <span>Your ISP is&nbsp;</span>
                                    <span style={{ fontWeight: 'bold', textDecoration: 'underline', color: 'var(--accent)', fontFamily: 'monospace' }}>{clientInfo.asn}</span>
                                    <span>&nbsp;({clientInfo.isp})</span>
                                    {clientInfo.countryCode && (
                                        <img 
                                            src={`https://flagcdn.com/w20/${clientInfo.countryCode.toLowerCase()}.png`} 
                                            alt={clientInfo.countryCode} 
                                            style={{
                                                marginLeft: '0.5rem',
                                                border: '1px solid var(--text-primary)',
                                                height: '13px',
                                                display: 'inline-block',
                                                verticalAlign: 'middle'
                                            }}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSearch} className="flex gap-4 items-center" style={{ flexWrap: 'wrap' }}>
                        <div className="input-group" style={{ flexGrow: 1, minWidth: '300px' }}>
                            <label className="input-label">추적 대상 입력</label>
                            <input
                                type="text"
                                placeholder="예: 202.30.50.51, kisa.or.kr, AS9700, 8.8.8.8"
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

                {renderResultSection()}
            </div>
            
            <div className="card info-box">
                <h3 className="info-title">서비스 이용 안내</h3>
                <div className="info-grid">
                    <div className="info-item md-col-span-2">
                        <span className="info-label">데이터 출처:</span>
                        <span>공공데이터포털 (한국인터넷진흥원_인터넷주소 정보 검색) & RIR 글로벌 RDAP</span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">지원 대상:</span>
                        <span>IPv4/IPv6 (국내/해외), 국내 도메인 (.kr, .한국), AS번호</span>
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
