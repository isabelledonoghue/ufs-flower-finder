from flask import Flask, request, jsonify, render_template
import os
import sqlite3
import subprocess
import json
import logging # REMOVE
from database import insert_data, setup_database, add_to_shopping_list, remove_from_shopping_list, get_shopping_list, save_cart, get_saved_carts, clear_saved_carts

app = Flask(__name__)
# REMOVE configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# call setup_database to ensure the database is set up correctly
setup_database()

# render pages
@app.route('/')
def index():
    return render_template('query.html')

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
# def run_scraper(script_name, delivery_date, flower_names):
#     """Run a Puppeteer script and return its output."""
#     try:
#         # construct command to run using arguments
#         command = ['node', script_name, '--deliveryDate', delivery_date, '--flowerNames', ','.join(flower_names)]
#         logger.debug(f"Running scraper with command: {command}")

#         result = subprocess.run(command, capture_output=True, text=True)
        
#         if result.returncode != 0:
#             print(f"Error running {script_name}: {result.stderr}")
#             return None

#         logger.debug(f"Scraper output for {script_name}: {result.stdout}")

#         # parse json
#         try:
#             data = json.loads(result.stdout)
#             logger.debug(f"Scraper returned data: {data}")
#             return data
#         except json.JSONDecodeError as e:
#             logger.error(f"Failed to parse JSON from {script_name}: {e}")
#             return None
#         #return result.stdout
    
#     except Exception as e:
#         logger.exception(f"Exception in run_scraper: {e}")
#         return None


# runs each of the scripts
# def run_all_scrapers(delivery_date, flower_names, scripts):
#     """Run all Puppeteer scripts and return their combined JSON outputs."""
#     try:
#         all_data = []
#         logger.debug(f"Starting to scrape with delivery_date={delivery_date}, flower_names={flower_names}, scripts={scripts}")

#         for script in scripts:
#             logger.debug(f"Scraping data from {script}")
#             print(f"scraping data from {script}")
#             output = run_scraper(f'{script}.js', delivery_date, flower_names)

#             if output is None:
#                 logger.warning(f"Scraper {script} failed or returned no output.")
#                 continue
            
#             try:
#                 data = json.loads(output)
#                 logger.debug(f"Parsed JSON data from {script}: {data}")
#             except json.JSONDecodeError:
#                 print(f"Invalid JSON received from {script}")
#                 continue
            
#             all_data.extend(data)
        
#         logger.debug(f"All scraped data: {all_data}")
#         return all_data
    
#     except Exception as e:
#         logger.exception(f"Exception in run_all_scrapers: {e}")
#         return []


# scraping API endpointf
# @app.route('/scrape', methods=['POST'])
# def scrape():   
#     try:
#         logger.debug("Scrape endpoint called.")
#         # get parameters from request
#         # data = json.loads(request.data)
#         reqData = request.json
#         print("/scrape request data:", reqData)

#         delivery_dates = reqData.get('deliveryDates', [])
#         flower_names = reqData.get('flowerNames', [])
#         scripts = reqData.get('scripts', [])
        
#         # logger.debug(f"Received request with parameters: deliveryDates={delivery_dates}, flowerNames={flower_names}, scripts={scripts}")
#         print(f"arguments {scripts, delivery_dates, flower_names}")

#         if not delivery_dates or not flower_names or not scripts:
#             logger.error("Missing required parameters in the request.")
#             return jsonify({'error': 'Missing required parameters'}), 400
        
#         all_data = []

#         # loop through each delivery date
#         for delivery_date in delivery_dates:
#             logger.debug(f"Starting scraping for delivery date: {delivery_date}")
#             print(f"scraping for delivery date: {delivery_date}")

#             data = run_all_scrapers(delivery_date, flower_names, scripts)

#             if not data:
#                 logger.warning(f"Scraping failed or returned no data for delivery date: {delivery_date}")
#                 print(f"scraping failed for delivery date: {delivery_date}")
#                 continue # need to implement an indicator here
            
#             logger.debug(f"Scraping succeeded for delivery date: {delivery_date}, data: {data}")
#             all_data.extend(data)
                
#         if not all_data:        
#             logger.error("Scraping failed or no data received from any script.")
#             return jsonify({'error': 'Scraping failed or no data received'}), 500

#         formatted_data = [
#             (
#                 flower['flowerName'], flower['flowerImage'], flower['prices'], flower['stemPrice'], flower['color'], flower['height'],
#                 flower['stemsPer'], flower['seller'], flower['farm'], flower['available'], flower['delivery']
#             )
#             for flower in all_data
#         ]

#         logger.debug(f"Formatted data for database insertion: {formatted_data}")

#         # inserts scraped data into database
#         insert_data(formatted_data)
#         logger.info("Scraping completed successfully and data inserted into the database.")
#         return jsonify({'message': 'Scraping completed successfully'})

#     except Exception as e:
#         logger.error(f"An error occurred in the /scrape endpoint: {e}", exc_info=True)
#         return jsonify({'error': str(e)}), 500
    
def run_scraper(script_name, delivery_date, flower_names):
    command = ['node', script_name, '--deliveryDate', delivery_date, '--flowerNames', ','.join(flower_names)]
    logger.debug("run_scraper called with command: %s", command)
    try:
        node_check = subprocess.run(['node', '--version'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        logger.debug(f"Node.js version: {node_check.stdout}")
        logger.debug(f"Node.js error: {node_check.stderr}")
        
        result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, shell=True, timeout=0)
        logger.debug(f"stdout: {result.stdout}")
        logger.debug(f"stderr: {result.stderr}")
        
        if result.returncode != 0:
            logger.error(f"Error running {script_name}: {result.stderr}")
            return False  # Indicate failure to run the script
        
        logger.debug(f"Script {script_name} output: {result.stdout}")
        return True  # Indicate success

    except Exception as e:
        logger.exception(f"Exception while running {script_name}: {e}")
        return False  # Indicate failure to run the script

@app.route('/scrape', methods=['POST'])
def scrape():   
    try:
        logger.debug("Scrape endpoint called.")
        # get parameters from request
        # data = json.loads(request.data)
        reqData = request.json
        # print("/scrape request data:", reqData)

        delivery_dates = reqData.get('deliveryDates', [])
        flower_names = reqData.get('flowerNames', [])
        scripts = reqData.get('scripts', [])
        
        # logger.debug(f"Received request with parameters: deliveryDates={delivery_dates}, flowerNames={flower_names}, scripts={scripts}")
        logger.debug(f"arguments {scripts, delivery_dates, flower_names}")

        if not delivery_dates or not flower_names or not scripts:
            logger.error("Missing required parameters in the request.")
            return jsonify({'error': 'Missing required parameters'}), 400
        
        # loop through each delivery date
        for delivery_date in delivery_dates:
            for script in scripts:
                logger.debug(f"scraping data from {script}")
                if not run_scraper(script, delivery_date, flower_names):
                    return jsonify({'error': f"Failed to run scraper for {script} on {delivery_date}"}), 500

        logger.debug(f"ran all scripts")
        return jsonify({'message': 'scripts running successfully'}), 200
    
    except Exception as e:
        logger.error(f"An error occurred in the /scrape endpoint: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500
    

@app.route('/receive_scraped_data', methods=['POST'])
def receive_scraped_data():
    try:
        logger.debug("Received scraped data.")
        req_data = request.json
        # print("/receive_scraped_data request data:", req_data)

        scraped_data = req_data.get('scrapedData', [])
        if not scraped_data:
            return jsonify({'error': 'No scraped data provided'}), 400

        # Process and store the scraped data
        formatted_data = [
            (
                flower['flowerName'], flower['flowerImage'], flower['prices'], flower['stemPrice'], flower['color'], flower['height'],
                flower['stemsPer'], flower['seller'], flower['farm'], flower['available'], flower['delivery']
            )
            for flower in scraped_data
        ]

        # inserts scraped data into the database
        insert_data(formatted_data)
        logger.info("Scraped data received and inserted into the database.")
        return jsonify({'message': 'Scraped data inserted successfully'})

    except Exception as e:
        logger.error(f"An error occurred in the /receive_scraped_data endpoint: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@app.route('/clear_database', methods=['POST'])
def clear_database():
    try:
        setup_database()
        return jsonify({'message': 'Database cleared and schema recreated successfully'})
    except Exception as e:
        print(f"Error clearing database: {e}")
        return jsonify({'error': 'Failed to clear and recreate the database'}), 500
    
# shopping list   
@app.route('/shopping_list_data')
def shopping_list_data():
    # fetch shopping list items - current request
    shopping_items = get_shopping_list()
    items = shopping_items

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

@app.route('/clear_shopping_list', methods=['POST'])
def clear_shopping_list():
    try:
        conn = sqlite3.connect('flowers.db')
        c = conn.cursor()
        c.execute('DELETE FROM shopping_list')
        conn.commit()
        conn.close()
        return jsonify({'message': 'Shopping list cleared successfully'})
    except Exception as e:
        print(f"Error clearing shopping list: {e}")
        return jsonify({'error': 'Failed to clear shopping list'}), 500

# saved carts
@app.route('/remove_from_saved_cart', methods=['POST'])
def remove_from_saved_cart():
    flower_id = request.json.get('flowerId')
    conn = sqlite3.connect('flowers.db')
    c = conn.cursor()
    c.execute('''
        DELETE FROM saved_carts WHERE id = ?
    ''', (flower_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Item removed from saved cart'})

@app.route('/clear_saved_cart', methods=['POST'])
def clear_saved_cart():
    try:
        conn = sqlite3.connect('flowers.db')
        c = conn.cursor()
        c.execute('DELETE FROM saved_carts')
        conn.commit()
        conn.close()
        return jsonify({'message': 'Saved cart cleared successfully'})
    except Exception as e:
        print(f"Error clearing shopping list: {e}")
        return jsonify({'error': 'Failed to clear saved cart'}), 500

@app.route('/saved_cart_data')
def saved_cart_data():
    # fetch shopping list items - current request
    saved_items = get_saved_carts()
    items = saved_items

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

@app.route('/save_cart', methods=['POST'])
def save_cart_route():
    # Get the cart data from the request
    cart_items = request.json.get('cartItems', [])
    if not cart_items:
        return jsonify({'error': 'No items to save'}), 400
    try:
        save_cart(cart_items)  # Call the function from database.py to save the cart items
        # clear shopping list - now only saved cart
        clear_shopping_list()
        # DEBUG
        # saved_carts = get_saved_carts()
        # print("Saved cart contents:", saved_carts)
        return jsonify({'message': 'Cart saved successfully'}), 200
    except Exception as e:
        print(f"Error saving cart: {e}")
        return jsonify({'error': 'Failed to save cart'}), 500

# # for running locally
# if __name__ == "__main__":
#     app.run(debug=True)
# running on render
if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)