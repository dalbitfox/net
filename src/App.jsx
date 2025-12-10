import React, { useState, useEffect } from 'react';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import SubnetCalculator from './components/Calculator/SubnetCalculator';
import PlaceholderPage from './components/PlaceholderPage';

function App() {
    const [activePage, setActivePage] = useState('ipv4');
    const [theme, setTheme] = useState('dark');

    useEffect(() => {
        // Initial theme setup
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    const renderContent = () => {
        switch (activePage) {
            case 'ipv4':
                return <SubnetCalculator />;
            case 'cidr':
                return <PlaceholderPage title="IPv4 CIDR 계산기" icon="🔢" />;
            case 'ipv6':
                return <PlaceholderPage title="IPv6 서브넷 계산기" icon="🌐" />;
            case 'trace':
                return <PlaceholderPage title="IP 추적 (GeoLocation)" icon="🌍" />;
            case 'port':
                return <PlaceholderPage title="오픈 포트 스캐너" icon="🔌" />;
            default:
                return <SubnetCalculator />;
        }
    };

    return (
        <>
            <Header
                activePage={activePage}
                setActivePage={setActivePage}
                theme={theme}
                toggleTheme={toggleTheme}
            />

            <main className="container mx-auto py-8 flex-grow">
                <div className="fade-in-enter">
                    {renderContent()}
                </div>
            </main>

            <Footer />
        </>
    );
}

export default App;
