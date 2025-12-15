// src/utils/ipv6Logic.js

// Check if string is a valid IPv6 address
export const isValidIpv6 = (ip) => {
    if (!ip) return false;
    // Basic regex for IPv6 (supports compressed ::)
    const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
    return ipv6Regex.test(ip);
};

// Expand compressed IPv6 to full 8-group format (e.g., 2001:db8::1 -> 2001:0db8:0000:...)
export const expandIpv6 = (ip) => {
    let fullIp = ip;
    const expandGroup = (group) => group.padStart(4, '0');

    if (fullIp.indexOf('::') !== -1) {
        const [left, right] = fullIp.split('::');
        const leftGroups = left ? left.split(':') : [];
        const rightGroups = right ? right.split(':') : [];
        const missingGroups = 8 - (leftGroups.length + rightGroups.length);
        const zeros = Array(missingGroups).fill('0');
        fullIp = [...leftGroups, ...zeros, ...rightGroups].filter(g => g !== '').join(':');
    }

    // Check if we have 8 groups now (if originally full, logic above might need nuance, but basic split helps)
    // Actually simpler: split by ':', if '::' existed, insert 0s.
    // Re-verify logic:
    // If input is "2001:db8::1" -> left="2001:db8", right="1". Groups: L=[2001, db8], R=[1]. Missing=8-3=5. Zeros=['0','0','0','0','0']. Result: 2001:db8:0:0:0:0:0:1. Correct.

    return fullIp.split(':').map(expandGroup).join(':');
};

// Convert expanded IPv6 string to BigInt
const ipv6ToBigInt = (expandedIp) => {
    const hex = expandedIp.split(':').join('');
    return BigInt('0x' + hex);
};

// Convert BigInt to IPv6 string (compressed if possible preferred, but let's stick to expanded/clean)
const bigIntToIpv6 = (bigIntValue) => {
    let hex = bigIntValue.toString(16).padStart(32, '0');
    let groups = [];
    for (let i = 0; i < 32; i += 4) {
        groups.push(hex.substring(i, i + 4));
    }
    return groups.join(':');
};

// Compress IPv6 string (RFC 5952)
const compressIpv6 = (expandedIp) => {
    // 1. Remove leading zeros in each group
    let groups = expandedIp.split(':').map(g => g.replace(/^0+/, '') || '0');

    // 2. Find longest sequence of zeros
    let maxLen = 0;
    let maxStart = -1;
    let currentLen = 0;
    let currentStart = -1;

    for (let i = 0; i < groups.length; i++) {
        if (groups[i] === '0') {
            if (currentLen === 0) currentStart = i;
            currentLen++;
        } else {
            if (currentLen > maxLen) {
                maxLen = currentLen;
                maxStart = currentStart;
            }
            currentLen = 0;
        }
    }
    // Check trailing zeros
    if (currentLen > maxLen) {
        maxLen = currentLen;
        maxStart = currentStart;
    }

    // 3. Apply "::" if sequence length > 1
    if (maxLen > 1) {
        groups.splice(maxStart, maxLen, '');
        // If "::" is at start or end, we need an extra empty string for join to work correctly as "::"
        // actually, join(':') with one empty string inside gives "a::b".
        // But if start is empty -> "::b". If end is empty -> "a::". 
        // If it replaces the whole thing -> "::".
        // Let's rely on standard join behavior but careful with edges.
        if (maxStart === 0) groups.unshift('');
        if (maxStart + 1 === groups.length) groups.push(''); // +1 because we removed maxLen items and added 1 ''
    }

    return groups.join(':');
};

// Main Calculation Function
export const calculateIpv6Info = (ipAddress, prefixLength) => {
    if (!isValidIpv6(ipAddress)) return null;

    try {
        const expanded = expandIpv6(ipAddress);
        const ipBigInt = ipv6ToBigInt(expanded);

        const maskBits = BigInt(prefixLength);
        const totalBits = BigInt(128);
        const hostBits = totalBits - maskBits;

        // Create Mask
        const maxVal = (1n << 128n) - 1n; // F...F
        const hostMask = (1n << hostBits) - 1n; // 0...0F...F
        const netMask = maxVal ^ hostMask; // F...F0...0

        // Network Address: IP AND Mask
        const networkBigInt = ipBigInt & netMask;

        // Range End: Network OR HostMask
        const broadcastBigInt = networkBigInt | hostMask;

        // Total Addresses: 2^hostBits
        const totalAddresses = 1n << hostBits;

        // Gateway: Network + 1
        const gatewayBigInt = networkBigInt + 1n;

        return {
            ipAddress,
            expandedIp: expanded,
            prefixLength,
            networkAddress: compressIpv6(bigIntToIpv6(networkBigInt)),
            gateway: compressIpv6(bigIntToIpv6(gatewayBigInt)),
            rangeStart: compressIpv6(bigIntToIpv6(networkBigInt)),
            rangeEnd: compressIpv6(bigIntToIpv6(broadcastBigInt)),
            totalAddresses: totalAddresses.toString(), // String because likely huge
            totalAddressesFormatted: totalAddresses < 10000n
                ? totalAddresses.toString()
                : "2^" + hostBits.toString() // e.g., 2^64
        };
    } catch (e) {
        console.error("IPv6 Calculation Error", e);
        return null;
    }
};
