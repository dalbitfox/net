import React, { useState, useEffect } from 'react';
import { calculateIpv6Info } from '../../utils/ipv6Logic';

const Ipv6Calculator = () => {
    const [ipAddress, setIpAddress] = useState('2001:db8:abcd::1');
    const [prefixLength, setPrefixLength] = useState(64);
    const [result, setResult] = useState(null);

    useEffect(() => {
        const info = calculateIpv6Info(ipAddress, prefixLength);
        setResult(info);
    }, [ipAddress, prefixLength]);

    return (
        <div className="calculator-container">
            <div className="card">
                <h2 className="text-2xl font-bold mb-6 text-center" style={{ color: 'var(--accent)' }}>IPv6 서브넷 계산기</h2>

                {/* Input Row */}
                <div className="grid grid-cols-1 md-grid-cols-3 gap-6 mb-6">
                    <div className="md:col-span-2">
                        <InputGroup label="IPv6 주소">
                            <input
                                type="text"
                                value={ipAddress}
                                onChange={(e) => setIpAddress(e.target.value)}
                                placeholder="2001:db8::1"
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
                        <input type="text" value={result?.expandedIp || ''} readOnly className="font-mono text-sm" />
                    </InputGroup>

                    <div className="grid grid-cols-1 md-grid-cols-2 gap-6">
                        <InputGroup label="네트워크 주소 (Prefix)">
                            <input type="text" value={result ? `${result.networkAddress}/${result.prefixLength}` : ''} readOnly className="font-mono text-sm text-yellow" />
                        </InputGroup>
                        <InputGroup label="총 주소 개수">
                            <input type="text" value={result?.totalAddressesFormatted || ''} readOnly className="text-blue" />
                        </InputGroup>
                    </div>

                    <InputGroup label="범위 시작 (Start)">
                        <input type="text" value={result?.rangeStart || ''} readOnly className="font-mono text-sm" />
                    </InputGroup>
                    <InputGroup label="범위 끝 (End)">
                        <input type="text" value={result?.rangeEnd || ''} readOnly className="font-mono text-sm" />
                    </InputGroup>
                </div>
            </div>

            {/* Info Box */}
            {result && (
                <div className="card info-box mt-6" style={{ borderTop: '4px solid var(--accent)' }}>
                    <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--accent)' }}>IPv6 정보</h3>
                    <div className="font-mono text-sm leading-relaxed p-4 rounded bg-black/20">
                        <div className="mb-2">
                            <span className="opacity-60 block mb-1">Type:</span>
                            <span className="text-white font-bold">
                                {prefixLength === 128 ? 'Single Host (/128)' :
                                    prefixLength === 64 ? 'Standard Subnet (/64)' :
                                        prefixLength === 48 ? 'Site Prefix (/48)' : 'Custom Subnet'}
                            </span>
                        </div>
                        <div className="mb-2">
                            <span className="opacity-60 block mb-1">Host Inteface ID Bits:</span>
                            <span className="text-white">{128 - prefixLength} bits</span>
                        </div>
                        <div>
                            <span className="opacity-60 block mb-1">Calculation:</span>
                            <div className="text-xs opacity-80">
                                Total = 2<sup>{128 - prefixLength}</sup> = {result.totalAddresses}
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
