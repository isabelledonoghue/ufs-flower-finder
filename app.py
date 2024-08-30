from flask import Flask, request, jsonify, render_template
import sqlite3
import subprocess
import json
from database import insert_data, setup_database, add_to_shopping_list, remove_from_shopping_list, get_shopping_list

app = Flask(__name__)

# call setup_database to ensure the database is set up correctly
setup_database()

@app.route('/')
def index():
    return render_template('query.html')

# renders results page
@app.route('/results')
def results():
    return render_template('results.html')

@app.route('/list')
def list_view():
    return render_template('list.html')

# returns results data from database
@app.route('/results_data')
def results_data():
    conn = sqlite3.connect('flowers.db')
    c = conn.cursor()
    c.execute('SELECT * FROM flowers')
    flowers_data = c.fetchall()
    conn.close()
    
    return jsonify([
        {
            'id': flower[0],
            'flowerName': flower[1],
            'flowerImage': flower[2],
            'prices': flower[3],
            'stemPrice': flower[4],
            'color': flower[5],
            'height': flower[6],
            'stemsPer': flower[7],
            'seller': flower[8],
            'farm': flower[9],
            'available': flower[10],
            'delivery': flower[11]
        }
        for flower in flowers_data
    ])


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


@app.route('/clear_database', methods=['POST'])
def clear_database():
    try:
        setup_database()
        return jsonify({'message': 'Database cleared and schema recreated successfully'})
    except Exception as e:
        print(f"Error clearing database: {e}")
        return jsonify({'error': 'Failed to clear and recreate the database'}), 500






@app.route('/shopping_list_data')
def shopping_list_data():
    items = get_shopping_list()
    return jsonify([
        {
            'flowerName': item[1],
            'flowerImage': item[2],
            'prices': item[3],
            'stemPrice': item[4],
            'color': item[5],
            'height': item[6],
            'stemsPer': item[7],
            'seller': item[8],
            'farm': item[9],
            'available': item[10],
            'delivery': item[11],
            'id': item[0]
        }
        for item in items
    ])

@app.route('/add_to_shopping_list', methods=['POST'])
def add_to_shopping_list_view():
    flower_id = request.json.get('flowerId')
    if not flower_id:
        return jsonify({'error': 'Flower ID is required'}), 400
    print(f"Added flower ID {flower_id} to shopping list.")
    add_to_shopping_list(flower_id)
    return jsonify({'message': 'Item added to shopping list'})


@app.route('/remove_from_shopping_list', methods=['POST'])
def remove_from_shopping_list_view():
    flower_id = request.json.get('flowerId')
    if not flower_id:
        return jsonify({'error': 'Flower ID is required'}), 400
    remove_from_shopping_list(flower_id)
    print(f"Removed flower ID {flower_id} from shopping list.")
    return jsonify({'message': 'Item removed from shopping list'})

@app.route('/is_in_shopping_list', methods=['POST'])
def is_in_shopping_list():
    flower_id = request.json.get('flowerId')
    conn = sqlite3.connect('flowers.db')
    c = conn.cursor()
    c.execute('''
        SELECT COUNT(*) FROM shopping_list WHERE flower_id = ?
    ''', (flower_id,))
    is_in_list = c.fetchone()[0] > 0
    conn.close()
    return jsonify({'isInList': is_in_list})


if __name__ == "__main__":
    app.run(debug=True)