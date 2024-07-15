from flask import Flask, request, jsonify
import sqlite3
import subprocess
import json
from database import insert_data

app = Flask(__name__)

def query_database(query, params):
    conn = sqlite3.connect('flowers.db')
    c = conn.cursor()
    c.execute(query, params)
    result = c.fetchall()
    conn.close()
    return result

# searching API endpoint
@app.route('/search')
def search():
    flower_name = request.args.get('flower_name', '')
    query = '''
        SELECT flower_name, flower_image, price, color, height, stemsPer, seller, farm, availability, delivery
        FROM flowers
        WHERE flower_name LIKE ?
    '''
    result = query_database(query, (f'%{flower_name}%'))
    return jsonify(result)

# scraping API endpoint
@app.route('/scrape', methods=['POST'])
def scrape():
    # triggers Puppeteer script
    # TO DO - only calls Holex right now
    result = subprocess.run(['node', 'holex.js'], capture_output=True, text=True)
    if result.returncode != 0:
        return jsonify({'error': 'scraping failed'}), 500
    
    # FIX HERE - result is not json data
    print("Subprocess output:", result.stdout)
    data = json.loads(result.stdout)
    
    formatted_data = [
        (
            flower['flowerName'], flower['flowerImage'], flower['price'], flower['color'], flower['height'],
            flower['stemsPer'], flower['seller'], flower['farm'], flower['availability'], flower['delivery']
        )
        for flower in data
    ]
    
    # inserts scraped data into database
    insert_data(formatted_data)
    return jsonify({'message': 'Scraping completed successfully'})

if __name__ == "__main__":
    app.run(debug=True)