import React, { useState, useEffect } from 'react';
import { calculateCidrInfo } from '../../utils/subnetLogic';

const CidrCalculator = () => {
    const [ipAddress, setIpAddress] = useState('172.0.0.1');
    const [maskBits, setMaskBits] = useState(24);
    const [result, setResult] = useState(null);

    useEffect(() => {
        const info = calculateCidrInfo(ipAddress, maskBits);
        setResult(info);
    }, [ipAddress, maskBits]);

    return (
        <div className="calculator-container">
            <div className="card">
                <h2 className="text-2xl font-bold mb-6 text-center" style={{ color: 'var(--accent)' }}>CIDR Calculator</h2>

                {/* Input Row */}
                <div className="grid grid-cols-1 md-grid-cols-2 gap-6 mb-6">
                    <InputGroup label="IP Address (IP를 입력하세요)">
                        <input
                            type="text"
                            value={ipAddress}
                            onChange={(e) => setIpAddress(e.target.value)}
                            placeholder="172.0.0.1"
                            className="input-highlight"
                        />
                    </InputGroup>
                    <InputGroup label="Mask Bits">
                        <select
                            value={maskBits}
                            onChange={(e) => setMaskBits(parseInt(e.target.value))}
                        >
                            {Array.from({ length: 32 }, (_, i) => i + 1).map((bit) => (
                                <option key={bit} value={bit}>
                                    /{bit}
                                </option>
                            ))}
                        </select>
                    </InputGroup>
                </div>

                {/* CIDR Netmask / Wildcard Mask */}
                <div className="grid grid-cols-1 md-grid-cols-2 gap-6 mb-6">
                    <InputGroup label="CIDR Netmask">
                        <input type="text" value={result?.subnetMask || ''} readOnly />
                    </InputGroup>
                    <InputGroup label="Wildcard Mask">
                        <input type="text" value={result?.wildcardMask || ''} readOnly />
                    </InputGroup>
                </div>

                {/* Max Subnets / Max Addresses */}
                <div className="grid grid-cols-1 md-grid-cols-2 gap-6 mb-6">
                    <InputGroup label="Maximum Subnets">
                        <input type="text" value={result?.maxSubnets || ''} readOnly />
                    </InputGroup>
                    <InputGroup label="Maximum Addresses">
                        <input type="text" value={result?.maxAddresses || ''} readOnly />
                    </InputGroup>
                </div>

                {/* CIDR Network (Route) / Net : CIDR Notation */}
                <div className="grid grid-cols-1 md-grid-cols-2 gap-6 mb-6">
                    <InputGroup label="CIDR Network (Route)">
                        <input type="text" value={result?.networkId || ''} readOnly />
                    </InputGroup>
                    <InputGroup label="Net : CIDR Notation">
                        <input type="text" value={result?.route || ''} readOnly />
                    </InputGroup>
                </div>

                {/* CIDR Address Range */}
                <InputGroup label="CIDR Address Range">
                    <input type="text" value={result?.range || ''} readOnly className="text-green" />
                </InputGroup>
            </div>

            {result && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                    {/* Left Card: Network Range Guide */}
                    <div className="card info-box" style={{ borderTop: '4px solid var(--accent)' }}>
                        <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--accent)' }}>네트워크 범위 가이드 (/{maskBits})</h3>
                        <div className="font-mono text-sm leading-relaxed p-4 rounded bg-black/20 h-full">

                            {/* Unified Header Logic for Consistency */}
                            <div className="mb-4 opacity-80 space-y-1">
                                <p>1. 호스트 비트 = <span className="text-white">32 - {maskBits} = {32 - maskBits} 비트</span></p>
                                <p>2. 블록 크기 = <span className="text-white">2<sup>{32 - maskBits}</sup> = {Math.pow(2, 32 - maskBits).toLocaleString()}</span></p>
                                <p>3. 구간 찾기 = <span className="text-white">
                                    {maskBits % 8 === 0
                                        ? "8비트 단위로 나누어 떨어짐 (정확한 옥텟 구분)"
                                        : `IP 옥텟을 블록 크기(${Math.pow(2, 32 - maskBits)})로 나눈 몫 × 블록 크기`}
                                </span></p>
                            </div>

                            <div className="border-t border-gray-700 pt-4 text-xs sm:text-sm space-y-3">
                                {/* Block Size - Single Line */}
                                <div className="flex items-center gap-2">
                                    <span className="opacity-60 min-w-[80px] text-right">블록 크기 :</span>
                                    <span className="font-bold text-lg text-accent">{Math.pow(2, 32 - maskBits).toLocaleString()}</span>
                                </div>

                                {/* Target Octet - Single Line */}
                                <div className="flex items-center gap-2">
                                    <span className="opacity-60 min-w-[80px] text-right">대상 옥텟 :</span>
                                    <span>
                                        {maskBits % 8 === 0 ? (
                                            // Octet Boundary
                                            `${maskBits / 8 + 1}번째 옥텟부터 호스트 대역`
                                        ) : (
                                            // CIDR Boundary
                                            `${Math.floor((maskBits - 1) / 8) + 1}번째 옥텟 (값: ${parseInt(ipAddress.split('.')[Math.floor((maskBits - 1) / 8)] || 0)})`
                                        )}
                                    </span>
                                </div>

                                {/* Calculation / Range Display */}
                                <div className="flex flex-col gap-2 mt-2">
                                    <span className="opacity-60">계산 과정 :</span>
                                    <div className="p-3 bg-black/30 rounded box-border w-full">
                                        {(() => {
                                            // Determine which octet to visualize based on the mask
                                            // /8 -> Index 1 (2nd octet), /16 -> Index 2 (3rd), /24 -> Index 3 (4th), /25 -> Index 3, /32 -> Index 3
                                            // Note: For /32, we visualize the 4th octet (Index 3).
                                            const visualIndex = Math.min(3, Math.floor(maskBits / 8));

                                            // Determine visual block size for that specific octet (0-255)
                                            let visualSize;
                                            if (maskBits === 32) visualSize = 1;
                                            else if (maskBits % 8 === 0) visualSize = 256;
                                            else visualSize = Math.pow(2, 8 - (maskBits % 8));

                                            const ipOctets = ipAddress.split('.');
                                            const targetVal = parseInt(ipOctets[visualIndex] || 0);

                                            // Calculate start/end based on floor logic
                                            // For size 256, floor(x/256) is always 0.
                                            const startVal = Math.floor(targetVal / visualSize) * visualSize;
                                            const endVal = startVal + visualSize - 1;

                                            return (
                                                <div className="space-y-1">
                                                    <div className="flex gap-2">
                                                        <span className="opacity-60 w-24 text-right">1. 대상 값 :</span>
                                                        <span className="text-white">{targetVal}</span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <span className="opacity-60 w-24 text-right">2. 구간 시작 :</span>
                                                        <span>floor({targetVal} / {visualSize}) × {visualSize} = <span className="text-green-400 font-bold">{startVal}</span></span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <span className="opacity-60 w-24 text-right">3. 구간 끝 :</span>
                                                        <span>{startVal} + {visualSize} - 1 = <span className="text-green-400 font-bold">{endVal}</span></span>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Right Card: Wildcard Mask Calculation Logic */}
                    <div className="card info-box" style={{ borderTop: '4px solid var(--accent)' }}>
                        <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--accent)' }}>와일드카드 마스크 계산 로직</h3>
                        <div className="font-mono text-base leading-relaxed p-4 rounded bg-black/20 h-full flex flex-col justify-center">
                            <div className="flex items-center gap-4 mb-2">
                                <span className="w-40 text-right opacity-60">전체 브로드캐스트</span>
                                <span className="tracking-wider">255 . 255 . 255 . 255</span>
                            </div>
                            <div className="flex items-center gap-4 border-b border-gray-600 pb-3 mb-3">
                                <span className="w-40 text-right opacity-60">- 서브넷 마스크</span>
                                <span className="tracking-wider">
                                    {result.subnetMask.split('.').map((octet, i) => (
                                        <span key={i}>{octet.toString().padStart(3, ' ')} {i < 3 ? '. ' : ''}</span>
                                    ))}
                                </span>
                            </div>
                            <div className="flex items-center gap-4 font-bold text-lg" style={{ color: 'var(--accent)' }}>
                                <span className="w-40 text-right text-sm font-normal opacity-60" style={{ color: 'inherit' }}>= 와일드카드 마스크</span>
                                <span className="tracking-wider">
                                    {result.wildcardMask.split('.').map((octet, i) => (
                                        <span key={i}>{octet.toString().padStart(3, ' ')} {i < 3 ? '. ' : ''}</span>
                                    ))}
                                </span>
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

export default CidrCalculator;
