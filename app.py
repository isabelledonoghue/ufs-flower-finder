from flask import Flask, request, jsonify
import sqlite3
import subprocess
import json
from database import insert_data

app = Flask(__name__)

@app.route('/')
def home():
    return "Flask server is running!"


# def query_database(query, params):
#     conn = sqlite3.connect('flowers.db')
#     c = conn.cursor()
#     c.execute(query, params)
#     result = c.fetchall()
#     conn.close()
#     return result

# # searching API endpoint
# @app.route('/search')
# def search():
#     flower_name = request.args.get('flower_name', '')
#     query = '''
#         SELECT flowerName, flowerImage, prices, color, height, stemsPer, seller, farm, available, delivery
#         FROM flowers
#         WHERE flowerName LIKE ?
#     '''
#     result = query_database(query, (f'%{flower_name}%'))
#     return jsonify(result)


# runs an individual scraper script
def run_scraper(script_name):
    """Run a Puppeteer script and return its output."""
    result = subprocess.run(['node', script_name], capture_output=True, text=True)
    
    if result.returncode != 0:
        print(f"Error running {script_name}: {result.stderr}")
        return None

    return result.stdout

# runs each of the scripts
def run_all_scrapers():
    """Run all Puppeteer scripts and return their combined JSON outputs."""
    # NOTE will need to comment all console.logs before running API
    scripts = ['mayesh.js']
    all_data = []

    for script in scripts:
        print(f"scraping data from {script}")
        output = run_scraper(script)
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
    data = run_all_scrapers()
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
    app.run(debug=True)