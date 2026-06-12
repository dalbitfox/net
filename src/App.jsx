import React, { useState, useEffect } from 'react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import SubnetCalculator from './components/Calculator/SubnetCalculator';
import CidrCalculator from './components/Calculator/CidrCalculator';
import Ipv6Calculator from './components/Calculator/Ipv6Calculator';
import IpTracker from './components/Calculator/IpTracker';
import PingTester from './components/Calculator/PingTester';
import PlaceholderPage from './components/PlaceholderPage';
import TodoApp from './components/Todo/TodoApp';
import IpScanner from './components/Calculator/IpScanner';

import PortScanner from './components/PortScanner/PortScanner';

function App() {
    const [activePage, setActivePage] = useState('ipv4');
    const [theme, setTheme] = useState('dark');
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        // Initial theme setup
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    const handleLogoClick = () => {
        setRefreshKey(prev => prev + 1);
    };

    const renderContent = () => {
        switch (activePage) {
            case 'ipv4':
                return <SubnetCalculator />;
            case 'cidr':
                return <CidrCalculator />;
            case 'ipv6':
                return <Ipv6Calculator />;
            case 'trace':
                return <IpTracker />;
            case 'ping':
                return <PingTester />;
            case 'port':
                return <PortScanner />;
            case 'ipscanner':
                return <IpScanner />;
            case 'contact':
                return <TodoApp />;
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
                onLogoClick={handleLogoClick}
            />

            <main className="container mx-auto py-8 flex-grow">
                <div className="fade-in-enter" key={`${activePage}-${refreshKey}`}>
                    {renderContent()}
                </div>
            </main>

            <Footer />
            <SpeedInsights />
        </>
    );
}

export default App;
