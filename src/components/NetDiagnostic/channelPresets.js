export const presets = [
    { label: 'Common TCP', ports: '21,22,23,25,80,443', protocol: 'tcp', display: '21,22,23,25,80,443' },
    { label: 'Web Ports', ports: '80,443,8080,8443', protocol: 'tcp', display: '80,443,8080,8443' },
    { label: 'Remote Access', ports: '21,22,23', protocol: 'tcp', display: '21,22,23' },
    { label: 'Databases', ports: '3306,5432,1433,27017', protocol: 'tcp', display: '3306,5432,1433,27017' },
    { label: 'Common UDP', ports: '53,123,161,5060', protocol: 'udp', display: '53,123,161,5060' },
    { label: 'Top 100', ports: '1-100', protocol: 'tcp', display: '1-100' }
];
