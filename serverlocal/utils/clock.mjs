import http from 'node:http'

// Global synchronization state variables
let anchorAtomicTimeMs = 0n; // True atomic time anchor in milliseconds
let anchorHrTimeNs = 0n;     // CPU high-resolution timer anchor in nanoseconds
let lastSyncTimeIso = "";
let syncIntervalTimer = null;

/**
 * Sends a single HEAD request over HTTP and returns the absolute timestamp 
 * corrected with the calculated network round-trip latency.
 */
function fetchSingleSample() {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const options = { method: 'HEAD', host: '1.1.1.1', port: 80, path: '/', timeout: 3000 };

        const req = http.request(options, (res) => {
            const endTime = Date.now();
            const rtt = endTime - startTime;
            const oneWayLatency = rtt / 2;

            const serverDateStr = res.headers.date;
            if (!serverDateStr) {
                reject(new Error("Missing Date header"));
                return;
            }

            // Math.round fixes the RangeError by stripping away decimal floating points
            const trueAtomicTimeMs = Math.round(Date.parse(serverDateStr) + oneWayLatency);
            resolve({ atomicTimeMs: trueAtomicTimeMs, rtt: rtt });
        });

        req.on('error', (err) => reject(err));
        req.on('timeout', () => { req.destroy(); reject(new Error("Timeout")); });
        req.end();
    });
}

/**
 * Fires 5 concurrent requests, discards the highest and lowest latency spikes,
 * averages the median samples, and anchors the final time to the CPU hardware clock.
 */
async function synchronizeTimeMultiSample() {
    console.log(`[${new Date().toISOString()}] Initiating 5-sample burst HTTP time sync...`);

    const samplePromises = Array.from({ length: 5 }, () => fetchSingleSample().catch(err => null));
    const results = (await Promise.all(samplePromises)).filter(item => item !== null);

    // If less than 3 samples succeed, we don't have enough data to filter safely
    if (results.length < 3) {
        console.error(`Sync Failed: Insufficient valid network samples (${results.length}/5).`);
        if (anchorAtomicTimeMs === 0n) {
            console.log("Retrying initial sync in 5 seconds...");
            setTimeout(synchronizeTimeMultiSample, 5000);
        }
        return;
    }

    // Sort results by Round-Trip Time (RTT) to locate the outliers
    results.sort((a, b) => a.rtt - b.rtt);

    // Discard the absolute lowest and absolute highest latency spikes
    const filteredSamples = results.slice(1, -1);

    // Compute the mathematical average of the remaining stable median samples
    const totalAtomicTime = filteredSamples.reduce((sum, item) => sum + BigInt(item.atomicTimeMs), 0n);
    const averagedAtomicTimeMs = totalAtomicTime / BigInt(filteredSamples.length);
    const averageRtt = filteredSamples.reduce((sum, item) => sum + item.rtt, 0) / filteredSamples.length;

    // Lock the averaged true atomic time to CPU hardware ticks
    anchorHrTimeNs = process.hrtime.bigint();
    anchorAtomicTimeMs = averagedAtomicTimeMs;
    lastSyncTimeIso = new Date(Number(averagedAtomicTimeMs)).toISOString();

    console.log(`[Sync Success] Outliers scrubbed. Stable Samples: ${filteredSamples.length} | Avg RTT: ${averageRtt.toFixed(1)}ms | Sync Anchored.`);
}

/**
 * Calculates current precise time independent of OS clock manipulation 
 * by checking elapsed CPU cycles against the hardware anchor.
 */
function getIndependentTimeMs() {
    if (anchorAtomicTimeMs === 0n) {
        return Date.now(); // Fallback if initial sync hasn't resolved yet
    }

    const currentHrTimeNs = process.hrtime.bigint();
    const elapsedNs = currentHrTimeNs - anchorHrTimeNs;
    const elapsedMs = elapsedNs / 1_000_000n; // Nanoseconds to Milliseconds conversion

    return Number(anchorAtomicTimeMs + elapsedMs);
}

// 1. Fire initial 5-sample burst sync immediately at startup
synchronizeTimeMultiSample();

// 2. Schedule automatic burst re-syncs every 30 minutes
const THIRTY_MINUTES_MS = 30 * 60 * 1000;
syncIntervalTimer = setInterval(synchronizeTimeMultiSample, THIRTY_MINUTES_MS);

// 3. Start local HTTP API architecture
const server = http.createServer((req, res) => {
    if (req.url.startsWith('/api/exact-time')) {
        const independentTimeMs = getIndependentTimeMs();

        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Access-Control-Allow-Origin': '*'
        });

        res.end(JSON.stringify({
            status: "success",
            independent_timestamp_ms: independentTimeMs,
            independent_iso_string: new Date(independentTimeMs).toISOString(),
            last_filtered_sync_utc: lastSyncTimeIso
        }));
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

server.listen(5001, () => {
    console.log('🚀 Jitter-Insulated API Server active at http://localhost:5001/api/exact-time');
});
