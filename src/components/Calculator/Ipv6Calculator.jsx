import React, { useState, useEffect } from 'react';
import { calculateIpv6Info } from '../../utils/ipv6Logic';

const Ipv6Calculator = () => {
    const [ipAddress, setIpAddress] = useState('2001:270:faff::1');
    const [prefixLength, setPrefixLength] = useState(64);
    const [result, setResult] = useState(null);

    useEffect(() => {
        const info = calculateIpv6Info(ipAddress, prefixLength);
        setResult(info);
    }, [ipAddress, prefixLength]);

    return (
        <div className="calculator-container">
            <div className="card">
                <h2 className="text-2xl font-bold mb-6 text-center" style={{ color: 'var(--accent)' }}>IPv6 CIDR 계산기</h2>

                {/* Input Row */}
                <div className="grid grid-cols-1 md-grid-cols-3 gap-6 mb-6">
                    <div className="md:col-span-2">
                        <InputGroup label="IPv6 주소 (IP를 입력하세요)">
                            <input
                                type="text"
                                value={ipAddress}
                                onChange={(e) => setIpAddress(e.target.value)}
                                placeholder="2001:270:faff::1"
                                className="input-highlight font-mono"
                            />
                        </InputGroup>
                    </div>
                    <InputGroup label="Prefix Length">
                        <select
                            value={prefixLength}
                            onChange={(e) => setPrefixLength(parseInt(e.target.value))}
                        >
                            {Array.from({ length: 128 }, (_, i) => i + 1).map((bit) => (
                                <option key={bit} value={bit}>
                                    /{bit}
                                </option>
                            ))}
                        </select>
                    </InputGroup>
                </div>

                {/* Results Grid - Mimicking IPv4 Layout */}
                <div className="grid grid-cols-1 gap-6 mb-6">
                    <InputGroup label="확장된 IPv6 주소 (Expanded)">
                        <div className="input-display font-mono text-sm">{result?.expandedIp || ''}</div>
                    </InputGroup>

                    <div className="grid grid-cols-1 md-grid-cols-3 gap-6">
                        <InputGroup label="애니캐스트 (Anycast IP / Subnet Prefix)">
                            <div className="input-display font-mono text-sm text-yellow">{result ? `${result.networkAddress}/${result.prefixLength}` : ''}</div>
                        </InputGroup>
                        <InputGroup label="게이트웨이 (Suggested Gateway)">
                            <div className="input-display font-mono text-sm text-green">{result?.gateway || ''}</div>
                        </InputGroup>
                        <InputGroup label="총 주소 개수">
                            <div className="input-display text-blue">{result?.totalAddressesFormatted || ''}</div>
                        </InputGroup>
                    </div>

                    <InputGroup label="할당 가능 범위 (Range / Available Hosts)">
                        <div className="input-display font-mono text-sm">
                            {result ? `${result.rangeStart} ~ ${result.rangeEnd}` : ''}
                        </div>
                    </InputGroup>
                </div>
            </div>

            {/* Info Box */}
            {result && (
                <div className="grid grid-cols-1 md-grid-cols-2 gap-6 mt-6">
                    {/* Left Card: Allocations */}
                    <div className="card info-box" style={{ borderTop: '4px solid var(--accent)' }}>
                        <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--accent)' }}>IPv6 할당 및 규칙</h3>
                        <div className="font-mono text-sm leading-relaxed p-4 rounded bg-black/20 h-full">
                            <div className="mb-4">
                                <span className="opacity-60 block mb-1">[주소 압축 규칙]</span>
                                <div className="text-white text-xs opacity-80">
                                    '::'는 연속된 0 그룹을 줄여서 표현합니다.
                                </div>
                            </div>

                            <div>
                                <span className="opacity-60 block mb-2">[주요 할당 정보]</span>
                                <div className="text-white text-xs opacity-80 space-y-1">
                                    <div>PD : 54 비트</div>
                                    <div>Host : 52 ~ 64 비트</div>
                                    <div>PTP 구간 : 126 비트</div>
                                    <div>Loopback : 128 비트</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Card: General Info */}
                    <div className="card info-box" style={{ borderTop: '4px solid var(--accent)' }}>
                        <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--accent)' }}>IPv6 기본 정보</h3>
                        <div className="font-mono text-sm leading-relaxed p-4 rounded bg-black/20 h-full">
                            <div className="mb-4">
                                <span className="opacity-60 block mb-1">Host Inteface ID Bits : </span>
                                <span className="text-white">{128 - prefixLength} bits</span>
                            </div>

                            <div>
                                <span className="opacity-60 block mb-1">[Calculation]</span>
                                <div className="text-xs opacity-80">
                                    <div className="mb-4">
                                        Total = 2<sup>{128 - prefixLength}</sup> = {result.totalAddresses}
                                    </div>
                                    <div className="text-yellow-400 space-y-1">
                                        <div>※ Anycast, Gateway (기본 2개 사용)</div>
                                        <div>※ Broadcast 주소 없음 (Multicast 사용)</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const InputGroup = ({ label, children }) => (
    <div className="input-group">
        <label className="input-label">{label}</label>
        {children}
    </div>
);

export default Ipv6Calculator;
