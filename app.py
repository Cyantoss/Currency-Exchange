from flask import Flask, render_template, request, jsonify, redirect, url_for
import requests
import time

app = Flask(__name__)

API_KEY = "8c391126ec3160c135044f36"  # your API key
API_URL = f"https://v6.exchangerate-api.com/v6/{API_KEY}/latest/USD"

# Simple in-memory cache for rates to avoid repeated slow API calls
RATES_CACHE = None
RATES_CACHE_TIME = 0
RATES_TTL = 300  # seconds


def get_rates():
    """Return cached rates if fresh; otherwise fetch from remote API with timeout.

    If fetching fails, return cached rates if available, otherwise an empty dict.
    """
    global RATES_CACHE, RATES_CACHE_TIME
    now = time.time()
    if RATES_CACHE and (now - RATES_CACHE_TIME) < RATES_TTL:
        return RATES_CACHE

    try:
        response = requests.get(API_URL, timeout=6)
        data = response.json()
        rates = data.get("conversion_rates", {})
        if rates:
            RATES_CACHE = rates
            RATES_CACHE_TIME = now
            return rates
        # if API returns no rates, fall back to cache
        if RATES_CACHE:
            return RATES_CACHE
        return {}
    except Exception as e:
        print("Error fetching rates:", e)
        # fallback to cache if available
        if RATES_CACHE:
            return RATES_CACHE
        return {}


# New endpoint to return rates without blocking page rendering
@app.route("/rates", methods=["GET"])
def rates_api():
    rates = get_rates()
    currencies = sorted(rates.keys())
    return jsonify({"rates": rates, "currencies": currencies})

@app.route("/", methods=["GET", "POST"])
def home():
    if request.method == "POST":
        name = request.form.get("name", "User")
        # Redirect to /converter so the URL reflects the converter page (POST-Redirect-GET)
        return redirect(url_for("converter", name=name))
    return render_template("index.html")

@app.route("/convert", methods=["POST"])
def convert():
    data = request.get_json()
    try:
        amount = float(data["amount"])
        from_currency = data["from"].upper()
        to_currency = data["to"].upper()
        
        rates = get_rates()
        if from_currency not in rates or to_currency not in rates:
            return jsonify({"error": "Currency not found"}), 400

        usd_amount = amount / rates[from_currency]
        converted = usd_amount * rates[to_currency]
        # rate for 1 unit of from_currency in terms of to_currency
        rate = rates[to_currency] / rates[from_currency]

        return jsonify({"result": round(converted, 2), "rate": round(rate, 6)})
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/converter", methods=["GET"])
def converter():
    """Render the converter page for GET requests.

    Allows visiting /converter directly (e.g., after bookmarking).
    Uses optional query param `name` or defaults to 'User'.
    """
    name = request.args.get("name", "User")
    # Render immediately without fetching rates server-side to avoid blocking.
    # The client will fetch `/rates` asynchronously to populate the selects.
    return render_template("converter.html", name=name, rates={}, currencies=[])

if __name__ == "__main__":
    app.run(debug=True)
