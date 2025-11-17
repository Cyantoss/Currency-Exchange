// Redirect to index on page reload when on the converter page so if user reloads, they start fresh again from home page
;(function redirectOnReloadToIndex() {
    try {
        // Only act on the converter page basically nothing else
        if (!window.location.pathname.startsWith('/converter')) return;

        // Modern Navigation Timing API
        const navEntries = (performance.getEntriesByType && performance.getEntriesByType('navigation')) || [];
        const nav = navEntries[0];
        if (nav && nav.type === 'reload') {
            window.location.replace('/');
            return;
        }

        // Fallback for older browsers
        if (performance.navigation && performance.navigation.type === 1) {
            window.location.replace('/');
            return;
        }
    } catch (e) {
    }
})();

// Dark/Light Mode Toggle
const toggleBtns = document.querySelectorAll("#toggle-mode");
toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        document.body.classList.toggle('dark');
        document.body.classList.toggle('light');
        btn.textContent = document.body.classList.contains('dark') ? 'Light Mode' : 'Dark Mode';
    });
});

// Currency Conversion (only for converter.html)
const convertBtn = document.getElementById('convert-btn');
if (convertBtn) {
    // Populate currency selects if empty by calling /rates
    async function loadRatesIfNeeded() {
        const fromSelect = document.getElementById('from-currency');
        const toSelect = document.getElementById('to-currency');
        if (!fromSelect || !toSelect) return;
        // if only the placeholder exists, fetch rates
        if (fromSelect.options.length <= 1 || toSelect.options.length <= 1) {
            try {
                const r = await fetch('/rates');
                if (!r.ok) {
                    throw new Error('Rates endpoint returned ' + r.status);
                }
                const js = await r.json();
                const currencies = js.currencies || [];
                // clear existing options except first
                function fill(select) {
                    select.length = 1;
                    currencies.forEach(code => {
                        const opt = document.createElement('option');
                        opt.value = code;
                        opt.textContent = code;
                        select.appendChild(opt);
                    });
                }
                fill(fromSelect);
                fill(toSelect);
                // enable convert button and clear status
                convertBtn.disabled = false;
                const resultEl = document.getElementById('result');
                if (resultEl) resultEl.textContent = '';
            } catch (err) {
                const resultEl = document.getElementById('result');
                if (resultEl) resultEl.textContent = 'Could not load rates — conversions unavailable.';
                // leave convert button disabled to prevent failing conversions
                convertBtn.disabled = true;
            }
        }
    }

    loadRatesIfNeeded();

    convertBtn.addEventListener('click', async () => {
        const amount = parseFloat(document.getElementById('amount').value);
        const from = document.getElementById('from-currency').value;
        const to = document.getElementById('to-currency').value;
        const resultEl = document.getElementById('result');

        if (!amount || !from || !to) {
            resultEl.textContent = "Please fill all fields!";
            return;
        }

        try {
            const response = await fetch("/convert", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({amount, from, to})
            });

            const data = await response.json();
            if (!response.ok) {
                resultEl.textContent = data.error || "Conversion error!";
                return;
            }
            if (data.result !== undefined) {
                const rateText = data.rate !== undefined ? ` (1 ${from} = ${data.rate.toFixed(6)} ${to})` : '';
                resultEl.textContent = `${amount} ${from} ≈ ${data.result.toFixed(2)} ${to}${rateText}`;
            } else {
                resultEl.textContent = data.error || "Conversion error!";
            }
        } catch (err) {
            resultEl.textContent = "Error connecting to server.";
        }
    });
}

// Mind your fucking business script Shehab.