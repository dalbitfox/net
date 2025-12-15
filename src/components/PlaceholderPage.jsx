import React from 'react';

const PlaceholderPage = ({ title, icon }) => {
    return (
        <div className="card flex flex-col items-center justify-center py-20 text-center">
            <div className="text-6xl mb-4 opacity-50 glow-text">{icon}</div>
            <h2 className="text-2xl font-bold mb-2">{title}</h2>
            <p className="text-[var(--text-secondary)] max-w-md mx-auto">
                이 기능은 준비 중입니다. <br />
                백엔드 연동이 필요한 기능일 수 있습니다.
            </p>
        </div>
    );
};

export default PlaceholderPage;
