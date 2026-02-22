import fs from 'node:fs/promises';
import path from 'node:path';

// Helper to safely parse strings with commas into integers (e.g. "1,709" -> 1709)
function parseIntSafe(val) {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    return parseInt(val.toString().replace(/,/g, ''), 10) || 0;
}

// Helper to determine the winner, votes, second votes, and lead from older popup_table format (2015/2020)
function processOldFormat(wardData) {
    if (!wardData || !Array.isArray(wardData.popup_table) || wardData.popup_table.length === 0) {
        return null; // Return null if invalid
    }

    const candidates = wardData.popup_table.map(c => ({
        name: c.Name,
        party: c.PartyGroup,
        votes: parseIntSafe(c.Vote)
    }));

    candidates.sort((a, b) => b.votes - a.votes);

    // Calculate total votes and percentages
    const totalVotes = candidates.reduce((sum, c) => sum + c.votes, 0);
    candidates.forEach(c => {
        c.percent = totalVotes > 0 ? ((c.votes / totalVotes) * 100).toFixed(1) : 0;
    });

    const top = candidates[0] || null;
    const second = candidates[1] || null;

    if (!top) return null;

    return {
        winnerName: top.name,
        party: top.party,
        votes: top.votes,
        lead: second ? (top.votes - second.votes) : null,
        totalVotes,
        candidates
    };
}

// Helper to determine the winner, votes, second votes, and lead from the 2025 format (array of candidates)
function processNewFormat(candidatesArr) {
    if (!candidatesArr || !Array.isArray(candidatesArr) || candidatesArr.length === 0) {
        return null;
    }

    const parsedCandidates = candidatesArr.map(c => ({
        name: c.Candidate_Name,
        party: c.Party,
        votes: parseIntSafe(c.Votes),
        status: c.Status
    }));

    // Calculate total votes and percentages
    const totalVotes = parsedCandidates.reduce((sum, c) => sum + c.votes, 0);
    parsedCandidates.forEach(c => {
        c.percent = totalVotes > 0 ? ((c.votes / totalVotes) * 100).toFixed(1) : 0;
    });

    // Find official winner if available, otherwise fallback to sorting by Votes
    let top = parsedCandidates.find(c => c.status === 'Won');

    // Fallback if Status is not present/valid
    if (!top) {
        parsedCandidates.sort((a, b) => b.votes - a.votes);
        top = parsedCandidates[0] || null;
    }

    if (!top) return null;

    // The second place candidate is the highest voted candidate that is NOT the top candidate
    const remaining = parsedCandidates.filter(c => c !== top);
    remaining.sort((a, b) => b.votes - a.votes);
    const second = remaining[0] || null;

    // Final sort for the candidates array (always by votes descending)
    parsedCandidates.sort((a, b) => b.votes - a.votes);

    return {
        winnerName: top.name,
        party: top.party,
        votes: top.votes,
        lead: second ? (top.votes - second.votes) : null,
        totalVotes,
        candidates: parsedCandidates
    };
}

export async function getUnifiedData() {
    // 1. Read all JSON files
    const cwd = process.cwd();
    const raw2015 = await fs.readFile(path.join(cwd, '2015.json'), 'utf-8').catch(() => '[]');
    const raw2020 = await fs.readFile(path.join(cwd, '2020.json'), 'utf-8').catch(() => '[]');
    const raw2025 = await fs.readFile(path.join(cwd, '2025.json'), 'utf-8').catch(() => '{}');

    let data2015 = [];
    let data2020 = [];
    let dict2025 = {};

    try { data2015 = JSON.parse(raw2015); } catch (e) { }
    try { data2020 = JSON.parse(raw2020); } catch (e) { }
    try { dict2025 = JSON.parse(raw2025); } catch (e) { }

    // 2. Normalize 2015 'BJP+' to 'NDA'
    if (Array.isArray(data2015)) {
        data2015.forEach(ward => {
            if (!ward) return;
            if (ward.PartyGroup === 'BJP+') ward.PartyGroup = 'NDA';
            if (Array.isArray(ward.popup_table)) {
                ward.popup_table.forEach(c => {
                    if (c && c.PartyGroup === 'BJP+') c.PartyGroup = 'NDA';
                });
            }
        });
    }

    // 3. Map everything by lowercase ward name for quick lookup
    const map2015 = new Map();
    data2015.forEach(w => w?.Ward && map2015.set(w.Ward.trim().toLowerCase(), w));

    const map2020 = new Map();
    data2020.forEach(w => w?.Ward && map2020.set(w.Ward.trim().toLowerCase(), w));

    const map2025 = new Map();
    // 2025 is an object where keys are "001", "002", etc. and values are arrays of candidate objects.
    // The candidate object has "Ward_Name". Let's use the first candidate's Ward_Name.
    for (const [key, candidates] of Object.entries(dict2025)) {
        if (Array.isArray(candidates) && candidates.length > 0 && candidates[0].Ward_Name) {
            map2025.set(candidates[0].Ward_Name.trim().toLowerCase(), candidates);
        }
    }

    // 4. Get a unified set of all normalized ward names
    const allKeys = new Set([...map2015.keys(), ...map2020.keys(), ...map2025.keys()]);

    const unifiedResult = [];

    // 5. Construct the final data payload
    for (const key of allKeys) {
        const w2015 = map2015.get(key) || null;
        const w2020 = map2020.get(key) || null;
        const cands2025 = map2025.get(key) || null;

        // Try to recover the proper capitalized Ward Name from whatever year we found it in
        const originalWardName =
            (cands2025 && cands2025[0]?.Ward_Name) ||
            (w2020 && w2020.Ward) ||
            (w2015 && w2015.Ward) ||
            key;

        unifiedResult.push({
            wardName: originalWardName.toUpperCase(),
            wardNameLower: originalWardName.toLowerCase(), // useful for search
            result2015: processOldFormat(w2015),
            result2020: processOldFormat(w2020),
            result2025: processNewFormat(cands2025)
        });
    }

    // Alphabetical sort by ward name
    unifiedResult.sort((a, b) => a.wardName.localeCompare(b.wardName));

    return unifiedResult;
}

export function getCorporationStats(unifiedData) {
    const years = ['2015', '2020', '2025'];

    // Structure to hold macro stats
    const stats = {
        seats: { '2015': { LDF: 0, UDF: 0, NDA: 0, OTHER: 0 }, '2020': { LDF: 0, UDF: 0, NDA: 0, OTHER: 0 }, '2025': { LDF: 0, UDF: 0, NDA: 0, OTHER: 0 } },
        votes: { '2015': { LDF: 0, UDF: 0, NDA: 0, OTHER: 0, TOTAL: 0 }, '2020': { LDF: 0, UDF: 0, NDA: 0, OTHER: 0, TOTAL: 0 }, '2025': { LDF: 0, UDF: 0, NDA: 0, OTHER: 0, TOTAL: 0 } },
        closestFights2025: [],
        flippedWards: []
    };

    function identifyParty(partyStr) {
        if (!partyStr) return 'OTHER';
        const p = partyStr.toUpperCase();
        if (p.includes('LDF') || p === 'CPI(M)' || p === 'CPI') return 'LDF';
        if (p.includes('UDF') || p === 'INC') return 'UDF';
        if (p.includes('NDA') || p === 'BJP') return 'NDA';
        return 'OTHER';
    }

    unifiedData.forEach(ward => {
        // Aggregate votes & seats per year
        years.forEach(year => {
            const result = ward['result' + year];
            if (!result) return;

            // SEATS
            const winningParty = identifyParty(result.party);
            stats.seats[year][winningParty]++;

            // VOTES
            result.candidates.forEach(cand => {
                const party = identifyParty(cand.party);
                stats.votes[year][party] += cand.votes;
                stats.votes[year].TOTAL += cand.votes;
            });
        });

        // Collect 2025 closest fights
        if (ward.result2025 && ward.result2025.lead !== null) {
            stats.closestFights2025.push({
                ward: ward.wardName,
                winner: ward.result2025.winnerName,
                party: ward.result2025.party,
                lead: ward.result2025.lead,
                runnerUp: ward.result2025.candidates?.[1]?.name || 'N/A',
                runnerUpParty: ward.result2025.candidates?.[1]?.party || 'N/A'
            });
        }

        // Flipped Wards (2020 -> 2025)
        if (ward.result2020 && ward.result2025) {
            const p2020 = identifyParty(ward.result2020.party);
            const p2025 = identifyParty(ward.result2025.party);
            if (p2020 !== p2025) {
                stats.flippedWards.push({
                    ward: ward.wardName,
                    from: p2020,
                    to: p2025,
                    originalParty: ward.result2020.party,
                    newParty: ward.result2025.party,
                    margin2025: ward.result2025.lead
                });
            }
        }
    });

    // Sort closest fights
    stats.closestFights2025.sort((a, b) => a.lead - b.lead);
    stats.closestFights2025 = stats.closestFights2025.slice(0, 10); // Top 10 closest

    // Sort flipped wards by highest margin in 2025
    stats.flippedWards.sort((a, b) => b.margin2025 - a.margin2025);

    return stats;
}
