import React from 'react';

const IpTracker = () => {
    return (
        <div className="calculator-container">
            <div className="card flex flex-col items-center justify-center py-20 text-center">
                <div className="text-6xl mb-4 opacity-50 glow-text">🚧</div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--accent)' }}>IP / 도메인 추적 (Whois)</h2>
                <p className="text-[var(--text-secondary)] max-w-md mx-auto mb-2">
                    공사중입니다.
                </p>
                <p className="text-[var(--text-secondary)] max-w-md mx-auto font-bold text-yellow-500">
                    공공데이터 OpenApI 연동 심사 중입니다.
                </p>
            </div>
        </div>
    );
};

export default IpTracker;
