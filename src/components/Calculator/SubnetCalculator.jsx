import React, { useState, useEffect } from 'react';
import { calculateSubnetInfo, getClassDefaults } from '../../utils/subnetLogic';

const SubnetCalculator = () => {
    const [networkClass, setNetworkClass] = useState('C');
    const [ipAddress, setIpAddress] = useState('192.168.0.1');
    const [maskBits, setMaskBits] = useState(24);
    const [result, setResult] = useState(null);

    const classInfoMap = {
        A: { range: '1.0.0.0 ~ 126.255.255.255', subnet: '255.0.0.0 (/8)', hosts: '약 1,677만 개', usage: '대규모 통신사, 글로벌 기업', feature: '첫 비트 0' },
        B: { range: '128.0.0.0 ~ 191.255.255.255', subnet: '255.255.0.0 (/16)', hosts: '약 65,000개', usage: '대학, 중형 기업', feature: '첫 두 비트 10' },
        C: { range: '192.0.0.0 ~ 223.255.255.255', subnet: '255.255.255.0 (/24)', hosts: '약 254개', usage: '소규모 조직, 가정용', feature: '첫 세 비트 110' },
        D: { range: '224.0.0.0 ~ 239.255.255.255', subnet: 'N/A', hosts: 'N/A', usage: '멀티캐스트', feature: '첫 네 비트 1110' },
        E: { range: '240.0.0.0 ~ 255.255.255.255', subnet: 'N/A', hosts: 'N/A', usage: '연구용', feature: '첫 네 비트 1111' },
    };

    useEffect(() => {
        const info = calculateSubnetInfo(ipAddress, maskBits);
        setResult(info);
    }, [ipAddress, maskBits]);

    const handleClassChange = (cls) => {
        setNetworkClass(cls);
        const defaults = getClassDefaults(cls);
        setIpAddress(defaults.ip);
        setMaskBits(24);
    };

    const currentClassInfo = classInfoMap[networkClass];

    return (
        <div className="calculator-container">
            <div className="card">
                {/* Network Class Buttons */}
                <div className="mb-6">
                    <label className="input-label mb-2 block">
                        네트워크 클래스
                    </label>
                    <div className="network-class-selector">
                        {['A', 'B', 'C', 'D', 'E'].map((cls) => (
                            <label key={cls} className="class-option">
                                <input
                                    type="radio"
                                    name="networkClass"
                                    value={cls}
                                    checked={networkClass === cls}
                                    onChange={(e) => handleClassChange(e.target.value)}
                                    className="hidden"
                                />
                                <span className="radio-circle">
                                    {networkClass === cls && <span className="radio-dot"></span>}
                                </span>
                                <span className="class-label">
                                    {cls}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Input Fields Grid */}
                <div className="grid grid-cols-1 md-grid-cols-2 gap-6 mb-6">
                    <InputGroup label="IP 주소 (IP를 입력하세요)">
                        <input
                            type="text"
                            value={ipAddress}
                            onChange={(e) => setIpAddress(e.target.value)}
                            placeholder="192.168.0.1"
                            className="input-highlight"
                        />
                    </InputGroup>
                    <InputGroup label="마스크 비트">
                        <select
                            value={maskBits}
                            onChange={(e) => setMaskBits(parseInt(e.target.value))}
                        >
                            {Array.from({ length: 9 }, (_, i) => i + 24).map((bit) => (
                                <option key={bit} value={bit}>
                                    /{bit}
                                </option>
                            ))}
                        </select>
                    </InputGroup>
                </div>

                {/* Results Grid - Matching Screenshot Layout (2 Columns) */}
                <div className="grid grid-cols-1 md-grid-cols-2 gap-6 mb-6">
                    <InputGroup label="할당 IP 범위">
                        <input type="text" value={result?.hostRange || ''} readOnly className="text-yellow" />
                    </InputGroup>
                    <InputGroup label="서브넷 마스크">
                        <input type="text" value={result?.subnetMask || ''} readOnly />
                    </InputGroup>

                    <InputGroup label="할당 IP 개수">
                        <input type="text" value={result?.totalIpCount?.toLocaleString() + ' 개' || ''} readOnly className="text-blue" />
                    </InputGroup>
                    <InputGroup label="네트워크 IP">
                        <input type="text" value={result?.networkId || ''} readOnly />
                    </InputGroup>

                    <InputGroup label="게이트웨이 IP">
                        <input type="text" value={result?.firstHost || ''} readOnly />
                    </InputGroup>
                    <InputGroup label="브로드캐스트 IP">
                        <input type="text" value={result?.broadcastAddress || ''} readOnly />
                    </InputGroup>
                </div>

                {/* Full Width Result */}
                <InputGroup label={
                    <span>
                        고객이 사용 할 수 있는 IP : <span style={{ color: '#FF1493', fontWeight: 'bold' }}>
                            {result?.usableCount !== undefined ? result.usableCount + ' 개' : 'N/A'}
                        </span>
                    </span>
                }>
                    <div className="usable-ip-box">
                        <span className="usable-ip-text">
                            {result?.usableRange || 'N/A'}
                        </span>
                    </div>
                </InputGroup>
            </div>

            {/* Side Info Panel (Cleaned Design) */}
            <div className="card info-box">
                <h3 className="info-title">
                    IPv4 {networkClass} 네트워크 클래스 - {networkClass} 클래스
                </h3>
                <div className="info-grid">
                    <InfoItem label="대역" value={currentClassInfo.range} />
                    <InfoItem label="서브넷 마스크" value={currentClassInfo.subnet} />
                    <InfoItem label="호스트 수" value={currentClassInfo.hosts} />
                    <InfoItem label="전통적 사용처" value={currentClassInfo.usage} />
                    <InfoItem label="특징" value={currentClassInfo.feature} fullWidth />
                </div>
            </div>
        </div>
    );
};

const InputGroup = ({ label, children }) => (
    <div className="input-group">
        <label className="input-label">{label}</label>
        {children}
    </div>
);

const InfoItem = ({ label, value, fullWidth }) => (
    <div className={`info-item ${fullWidth ? 'md-col-span-2' : ''}`}>
        <span className="info-label">{label}:</span>
        <span>{value}</span>
    </div>
);

export default SubnetCalculator;
