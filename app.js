import express from 'express';
import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Serve static files in the public folder
app.use(express.static('public'));

// Function to fetch metrics with retries
async function fetchMetricsWithRetries(url, options, maxRetries = 8) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const chrome = await launch({ chromeFlags: ['--headless'] });
        try {
            const runnerResult = await lighthouse(url, { ...options, port: chrome.port });
            const metrics = runnerResult.lhr.audits;
            const performanceMetrics = {
                'First Contentful Paint': metrics['first-contentful-paint']?.displayValue,
                'Largest Contentful Paint': metrics['largest-contentful-paint']?.displayValue,
                'Total Blocking Time': metrics['total-blocking-time']?.displayValue,
                'Cumulative Layout Shift': metrics['cumulative-layout-shift']?.displayValue,
                'Speed Index': metrics['speed-index']?.displayValue,
                'Performance Score': runnerResult.lhr.categories.performance.score * 100
            };

            // Check if 'First Contentful Paint' is undefined
            if (performanceMetrics['First Contentful Paint'] !== undefined) {
                await chrome.kill();
                return performanceMetrics; // Return metrics if 'First Contentful Paint' is defined
            }

            console.log(`Attempt ${attempt} failed ${url}. Retrying...`);
            await chrome.kill();
        } catch (error) {
            console.log(`Attempt ${attempt} failed with error: ${error.message}`);
            await chrome.kill();
        }
    }
    throw new Error(`Failed to retrieve complete metrics after ${maxRetries} attempts`);
}

// Endpoint to run Lighthouse audit
app.get('/audit', async (req, res) => {
    const url = req.query.url;
    if (!url) return res.status(400).send('URL is required');

    try {
        const options = {
            output: ['html', 'json'], // Output formats
            onlyCategories: ['performance'], // Restrict to performance category
            emulatedFormFactor: 'desktop', // Force desktop mode
            throttling: {
                rttMs: 40, // Simulated round-trip time in ms
                throughputKbps: 10000, // Bandwidth for desktop
                cpuSlowdownMultiplier: 1, // No CPU slowdown for desktop
            },
            maxWaitForFcp: 60000,
            maxWaitForLoad: 90000,
            disableStorageReset: true
        };

        const performanceMetrics = await fetchMetricsWithRetries(url, options);
        res.json(performanceMetrics);
    } catch (error) {
        res.status(500).send(`Error: ${error.message}`);
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
