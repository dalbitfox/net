// src/utils/subnetLogic.js

// Pure utility functions derived from legacy script.js

export const ipToOctets = (ip) => {
    return ip.split('.').map(octet => parseInt(octet, 10));
};

export const octetsToIp = (octets) => {
    return octets.join('.');
};

export const ipToDecimal = (ip) => {
    const octets = ipToOctets(ip);
    return ((octets[0] << 24) >>> 0) + ((octets[1] << 16) >>> 0) + ((octets[2] << 8) >>> 0) + octets[3];
};

export const decimalToIp = (decimal) => {
    return [
        (decimal >>> 24) & 255,
        (decimal >>> 16) & 255,
        (decimal >>> 8) & 255,
        decimal & 255
    ].join('.');
};

export const getSubnetMaskFromBits = (bits) => {
    bits = parseInt(bits);
    if (bits === 0) return '0.0.0.0';
    if (bits === 32) return '255.255.255.255';

    let mask = 0;
    for (let i = 0; i < bits; i++) {
        mask = (mask << 1) | 1;
    }
    mask = mask << (32 - bits);

    return decimalToIp((mask >>> 0));
};

export const isValidIp = (ip) => {
    if (!ip) return false;
    const parts = ip.split('.');
    if (parts.length !== 4) return false;

    return parts.every(part => {
        const num = parseInt(part, 10);
        return num >= 0 && num <= 255 && part === num.toString();
    });
};

export const calculateSubnetInfo = (ipAddress, maskBits) => {
    if (!isValidIp(ipAddress)) {
        return null;
    }

    try {
        const subnetMask = getSubnetMaskFromBits(maskBits);
        const ipDecimal = ipToDecimal(ipAddress);
        const maskDecimal = ipToDecimal(subnetMask);
        const networkIdDecimal = ipDecimal & maskDecimal;
        const networkId = decimalToIp(networkIdDecimal);

        // Calculate Broadcast Address
        const wildcardDecimal = (~maskDecimal) >>> 0;
        const broadcastDecimal = (networkIdDecimal | wildcardDecimal) >>> 0;
        const broadcastAddress = decimalToIp(broadcastDecimal);

        // Calculate Host Range
        const firstHostDecimal = (networkIdDecimal + 1) >>> 0;
        const lastHostDecimal = (broadcastDecimal - 1) >>> 0;
        const firstHost = decimalToIp(firstHostDecimal);
        const lastHost = decimalToIp(lastHostDecimal);

        // Calculate Total IP Count
        const totalIpCount = (broadcastDecimal - networkIdDecimal + 1) >>> 0;

        let result = {
            subnetMask,
            networkId,
            broadcastAddress,
            firstHost,
            lastHost,
            totalIpCount,
            hostRange: `${networkId} - ${broadcastAddress}`,
            usableRange: '',
            usableCount: '',
            type: 'Standard'
        };

        // Special cases
        if (maskBits === 31) {
            result.type = 'Point-to-Point';
            result.hostRange = `${networkId} - ${broadcastAddress}`;
            result.usableRange = 'point-to-point';
            result.usableCount = 0; // User requested 0 for /31
            result.networkId = 'N/A';
            result.broadcastAddress = 'N/A';
            result.firstHost = 'N/A'; // Gateway N/A
        } else if (maskBits === 32) {
            result.type = 'Loopback/Host';
            result.hostRange = `${networkId}`;
            result.usableRange = 'loopback';
            result.usableRange = 'loopback';
            result.usableCount = 0; // User requested 0 for /32
            result.networkId = 'N/A';
            result.broadcastAddress = 'N/A';
            result.firstHost = 'N/A';
        } else {
            result.usableRange = `${decimalToIp(firstHostDecimal + 1)} - ${lastHost}`;
            // hosts count excludes network, broadcast, and gateway (total - 3)
            const count = totalIpCount - 3;
            result.usableCount = count > 0 ? count.toLocaleString() : 0;
        }

        return result;

    } catch (error) {
        console.error("Calculation Error", error);
        return null;
    }
};

export const calculateCidrInfo = (ipAddress, maskBits) => {
    if (!isValidIp(ipAddress)) {
        return null;
    }

    try {
        const subnetMask = getSubnetMaskFromBits(maskBits);
        const ipDecimal = ipToDecimal(ipAddress);
        const maskDecimal = ipToDecimal(subnetMask);
        const networkIdDecimal = ipDecimal & maskDecimal;
        const networkId = decimalToIp(networkIdDecimal);

        // Wildcard Mask
        const wildcardDecimal = (~maskDecimal) >>> 0;
        const wildcardMask = decimalToIp(wildcardDecimal);

        // Broadcast Address
        const broadcastDecimal = (networkIdDecimal | wildcardDecimal) >>> 0;
        const broadcastAddress = decimalToIp(broadcastDecimal);

        // Max Addresses
        const maxAddresses = Math.pow(2, 32 - maskBits).toLocaleString();

        // Max Subnets (Relative to Class)
        const firstOctet = parseInt(ipAddress.split('.')[0], 10);
        let defaultBits = 0;
        if (firstOctet >= 1 && firstOctet <= 126) defaultBits = 8; // Class A
        else if (firstOctet >= 128 && firstOctet <= 191) defaultBits = 16; // Class B
        else if (firstOctet >= 192 && firstOctet <= 223) defaultBits = 24; // Class C
        else defaultBits = maskBits; // Others, treat as is

        let maxSubnets = 'N/A';
        if (maskBits >= defaultBits) {
            maxSubnets = Math.pow(2, maskBits - defaultBits).toLocaleString();
        }

        // CIDR Notation
        const cidrNotation = `/${maskBits}`;
        const route = `${networkId}/${maskBits}`;

        return {
            ipAddress,
            maskBits,
            subnetMask,
            wildcardMask,
            maxSubnets,
            maxAddresses,
            networkId,
            cidrNotation,
            route,
            range: `${networkId} - ${broadcastAddress}`
        };

    } catch (error) {
        console.error("CIDR Calculation Error", error);
        return null;
    }
};

export const getClassDefaults = (classLetter) => {
    const defaults = {
        'A': { ip: '10.0.0.1', bits: 8 },
        'B': { ip: '172.16.0.1', bits: 16 },
        'C': { ip: '192.168.0.1', bits: 24 },
        'D': { ip: '224.0.0.1', bits: 4 },
        'E': { ip: '240.0.0.1', bits: 4 }
    };
    return defaults[classLetter] || defaults['C'];
};
