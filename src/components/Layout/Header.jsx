import React, { useState } from 'react';

const Header = ({ activePage, setActivePage, theme, toggleTheme, onLogoClick }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const menuItems = [
        { id: 'ipv4', label: 'IPv4 서브넷' },
        { id: 'cidr', label: 'IPv4 CIDR' },
        { id: 'ipv6', label: 'IPv6 CIDR' },
        { id: 'trace', label: 'IP 추적' },
        { id: 'port', label: '포트 스캔' },
    ];

    const handleLogoClick = () => {
        if (onLogoClick) {
            onLogoClick();
        } else {
            window.location.reload();
        }
    };

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const handleMenuClick = (id) => {
        setActivePage(id);
        setIsMenuOpen(false); // Close menu on click
    };

    return (
        <header>
            <div className="container">
                {/* Top Row: Logo, Theme, Hamburger */}
                <div className="header-top">
                    <div className="logo-section" onClick={handleLogoClick} title="developer June™">
                        {/* Network Mesh SVG */}
                        <svg className="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="3" />
                            <circle cx="6" cy="6" r="2" />
                            <circle cx="18" cy="6" r="2" />
                            <circle cx="6" cy="18" r="2" />
                            <circle cx="18" cy="18" r="2" />
                            <line x1="12" y1="12" x2="7.5" y2="7.5" />
                            <line x1="12" y1="12" x2="16.5" y2="7.5" />
                            <line x1="12" y1="12" x2="7.5" y2="16.5" />
                            <line x1="12" y1="12" x2="16.5" y2="16.5" />
                        </svg>
                        <div className="text-container">
                            <span className="app-title" style={{ fontSize: '2.5rem' }}>
                                NetBox
                            </span>
                            <span className="app-subtitle">네트워크 전문가를 위한 만능 도구 상자</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={toggleTheme}
                            className="theme-toggle-btn"
                            title="테마 변경"
                        >
                            {theme === 'dark' ? '☀️' : '🌙'}
                        </button>

                        {/* Hamburger Button (Mobile Only) */}
                        <button
                            className="hamburger-btn"
                            onClick={toggleMenu}
                            aria-label="메뉴 열기"
                        >
                            <div className={`hamburger-line ${isMenuOpen ? 'open' : ''}`}></div>
                            <div className={`hamburger-line ${isMenuOpen ? 'open' : ''}`}></div>
                            <div className={`hamburger-line ${isMenuOpen ? 'open' : ''}`}></div>
                        </button>
                    </div>
                </div>

                {/* Navigation Tabs (Responsive) */}
                <nav className={`nav-tabs ${isMenuOpen ? 'show-mobile' : ''}`}>
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => handleMenuClick(item.id)}
                            className={`tab-btn ${activePage === item.id ? 'active' : ''}`}
                        >
                            {item.label}
                        </button>
                    ))}
                </nav>
            </div>
        </header>
    );
};

export default Header;
