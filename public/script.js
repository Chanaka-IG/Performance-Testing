document.getElementById('submitBtn').addEventListener('click', async () => {
    const urlInput = document.getElementById('urlInput').value;
    const numRuns = parseInt(document.getElementById('numRuns').value) || 1;
    const urls = urlInput.split(',').map(url => url.trim()).filter(url => url);

    if (urls.length === 0) {
        alert('Please enter at least one URL');
        return;
    }

    const metricsOutput = document.getElementById('metricsOutput');
    metricsOutput.innerHTML = '<tr><td colspan="7" style="text-align: center;">Loading metrics, please wait...</td></tr>';

    try {
        metricsOutput.innerHTML = '';

        for (const url of urls) {
            const metricsArray = {
                'First Contentful Paint': [],
                'Largest Contentful Paint': [],
                'Total Blocking Time': [],
                'Cumulative Layout Shift': [],
                'Speed Index': [],
                'Performance Score': []
            };

            for (let i = 1; i <= numRuns; i++) {
                const response = await fetch(`/audit?url=${encodeURIComponent(url)}`);
                if (!response.ok) throw new Error(`Failed to fetch metrics for ${url}`);

                const metrics = await response.json();

                // Store each metric value in the array, correctly parsing values
                metricsArray['First Contentful Paint'].push(metrics['First Contentful Paint'] ? parseFloat(metrics['First Contentful Paint']) : 0);
                metricsArray['Largest Contentful Paint'].push(metrics['Largest Contentful Paint'] ? parseFloat(metrics['Largest Contentful Paint']) : 0);
                metricsArray['Total Blocking Time'].push(metrics['Total Blocking Time'] ? parseFloat(metrics['Total Blocking Time'].replace(' ms', '').replace(',', '')) : 0);
                metricsArray['Cumulative Layout Shift'].push(metrics['Cumulative Layout Shift'] ? parseFloat(metrics['Cumulative Layout Shift']) : 0);
                metricsArray['Speed Index'].push(metrics['Speed Index'] ? parseFloat(metrics['Speed Index']) : 0);
                metricsArray['Performance Score'].push(metrics['Performance Score'] ? parseFloat(metrics['Performance Score']) : 0);

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${url}</td>
                    <td>${i}</td>
                    <td>${metrics['First Contentful Paint'] || 'N/A'}</td>
                    <td>${metrics['Largest Contentful Paint'] || 'N/A'}</td>
                    <td>${metrics['Total Blocking Time'] || 'N/A'}</td>
                    <td>${metrics['Cumulative Layout Shift'] || 'N/A'}</td>
                    <td>${metrics['Speed Index'] || 'N/A'}</td>
                    <td>${metrics['Performance Score'] || 'N/A'}</td>
                `;
                metricsOutput.appendChild(row);
            }

            // Calculate averages and add them to the table
            const averageRow = document.createElement('tr');
            averageRow.innerHTML = `
                <td>${url}</td>
                <td>Average</td>
                <td>${(metricsArray['First Contentful Paint'].reduce((a, b) => a + b, 0) / numRuns).toFixed(2)}</td>
                <td>${(metricsArray['Largest Contentful Paint'].reduce((a, b) => a + b, 0) / numRuns).toFixed(2)}</td>
                <td>${(metricsArray['Total Blocking Time'].reduce((a, b) => a + b, 0) / numRuns).toFixed(2)} ms</td>
                <td>${(metricsArray['Cumulative Layout Shift'].reduce((a, b) => a + b, 0) / numRuns).toFixed(2)}</td>
                <td>${(metricsArray['Speed Index'].reduce((a, b) => a + b, 0) / numRuns).toFixed(2)}</td>
                <td>${(metricsArray['Performance Score'].reduce((a, b) => a + b, 0) / numRuns).toFixed(2)}</td>
            `;
            metricsOutput.appendChild(averageRow);
        }
    } catch (error) {
        metricsOutput.innerHTML = `<tr><td colspan="7" style="text-align: center; color: red;">Error: ${error.message}</td></tr>`;
    }
});
document.getElementById('downloadCsvBtn').addEventListener('click', () => {
    const rows = [];
    const headers = ["URL", "Run", "First Contentful Paint", "Largest Contentful Paint", "Total Blocking Time", "Cumulative Layout Shift", "Speed Index", "Performance Score"];
    rows.push(headers.join(',')); // Add headers as the first row

    // Collect table data
    document.querySelectorAll('#metricsOutput tr').forEach(row => {
        const rowData = Array.from(row.querySelectorAll('td')).map(cell => `"${cell.innerText}"`);
        if (rowData.length) rows.push(rowData.join(','));
    });

    // Create CSV content
    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    // Trigger CSV download
    const link = document.createElement('a');
    link.href = url;
    link.download = 'OrangeHRM_Performance_Metrics.csv';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

document.getElementById('downloadPdfBtn').addEventListener('click', () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Define table columns and rows
    const headers = [["URL", "Run", "First Contentful Paint", "Largest Contentful Paint", "Total Blocking Time", "Cumulative Layout Shift", "Speed Index", "Performance Score"]];
    const rows = [];

    // Populate rows from table data
    document.querySelectorAll('#metricsOutput tr').forEach(row => {
        const rowData = Array.from(row.querySelectorAll('td')).map(cell => cell.innerText);
        if (rowData.length) rows.push(rowData);
    });

    doc.text("OrangeHRM Performance Metrics", 14, 20);
    doc.autoTable({
        startY: 30,
        head: headers,
        body: rows,
        styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
        columnStyles: {
            0: { cellWidth: 32 },  // URL
            1: { cellWidth: 18 },  // Run
            2: { cellWidth: 21 },  // First Contentful Paint
            3: { cellWidth: 21 },  // Largest Contentful Paint
            4: { cellWidth: 21 },  // Total Blocking Time
            5: { cellWidth: 21 },  // Cumulative Layout Shift
            6: { cellWidth: 21 },  // Speed Index
            7: { cellWidth: 21 }   // Performance Score
        },
    });

    doc.save('orangeHRM_performance_metrics.pdf');
});
