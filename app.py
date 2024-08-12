from flask import Flask, request, jsonify, render_template
import sqlite3
import subprocess
import json
from database import insert_data

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('query.html')


# runs an individual scraper script
def run_scraper(script_name, delivery_date, flower_names):
    """Run a Puppeteer script and return its output."""
    # construct command to run using arguments
    command = ['node', script_name, '--deliveryDate', delivery_date, '--flowerNames', ','.join(flower_names)]
    result = subprocess.run(command, capture_output=True, text=True)
    
    if result.returncode != 0:
        print(f"Error running {script_name}: {result.stderr}")
        return None

    return result.stdout

# runs each of the scripts
def run_all_scrapers(delivery_date, flower_names, scripts):
    """Run all Puppeteer scripts and return their combined JSON outputs."""
    all_data = []

    for script in scripts:
        print(f"scraping data from {script}")
        output = run_scraper(f'{script}.js', delivery_date, flower_names)
        if output is None:
            continue
        
        try:
            data = json.loads(output)
        except json.JSONDecodeError:
            print(f"Invalid JSON received from {script}")
            continue
        
        all_data.extend(data)
    
    return all_data

# scraping API endpoint
@app.route('/scrape', methods=['POST'])
def scrape():    
    # get parameters from request
    delivery_date = request.json.get('deliveryDate')
    flower_names = request.json.get('flowerNames', [])
    scripts = request.json.get('scripts', [])
    
    print(f"arguments {scripts, delivery_date, flower_names}")

    if not delivery_date or not flower_names or not scripts:
        return jsonify({'error': 'Missing required parameters'}), 400

    data = run_all_scrapers(delivery_date, flower_names, scripts)
    if not data:
        return jsonify({'error': 'Scraping failed or no data received'}), 500
    
    formatted_data = [
        (
            flower['flowerName'], flower['flowerImage'], flower['prices'], flower['stemPrice'], flower['color'], flower['height'],
            flower['stemsPer'], flower['seller'], flower['farm'], flower['available'], flower['delivery']
        )
        for flower in data
    ]
    
    # inserts scraped data into database
    insert_data(formatted_data)
    return jsonify({'message': 'Scraping completed successfully'})

if __name__ == "__main__":
    app.run(debug=True, port=5001)