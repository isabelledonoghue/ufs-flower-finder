import sqlite3

def setup_database():
    conn = sqlite3.connect('flowers.db')
    c = conn.cursor()
    c.execute('DROP TABLE IF EXISTS flowers')
    c.execute('DROP TABLE IF EXISTS shopping_list')
    with open('sql/schema.sql', 'r') as f:
        c.executescript(f.read())
    conn.commit()
    conn.close()

def insert_data(data):
    conn = sqlite3.connect('flowers.db')
    c = conn.cursor()
    c.executemany('''
        INSERT INTO flowers (
            flowerName, flowerImage, prices, stemPrice, color, height, stemsPer, seller, farm, available, delivery
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', data)
    conn.commit()
    conn.close()

# SHOPPING LIST
def add_to_shopping_list(flower_id):
    conn = sqlite3.connect('flowers.db')
    c = conn.cursor()
    c.execute('''
        INSERT INTO shopping_list (flower_id)
        VALUES (?)
    ''', (flower_id,))
    conn.commit()
    conn.close()

def remove_from_shopping_list(flower_id):
    conn = sqlite3.connect('flowers.db')
    c = conn.cursor()
    c.execute('''
        DELETE FROM shopping_list
        WHERE flower_id = ?
    ''', (flower_id,))
    conn.commit()
    conn.close()

def get_shopping_list():
    conn = sqlite3.connect('flowers.db')
    c = conn.cursor()
    c.execute('''
        SELECT f.id, f.flowerName, f.flowerImage, f.prices, f.stemPrice, f.color, f.height, f.stemsPer, f.seller, f.farm, f.available, f.delivery
        FROM shopping_list sl
        JOIN flowers f ON sl.flower_id = f.id
    ''')
    items = c.fetchall()
    print("Items fetched from database:", items)
    conn.close()
    return items

# SAVED CART
def save_cart(cart_items):
    conn = sqlite3.connect('flowers.db')
    c = conn.cursor()
    
    for item in cart_items:
        c.execute('''
            INSERT INTO saved_carts (
                flowerName, flowerImage, prices, stemPrice, color, height, stemsPer, seller, farm, available, delivery
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (item['flowerName'], item['flowerImage'], item['prices'], item['stemPrice'], item['color'],
              item['height'], item['stemsPer'], item['seller'], item['farm'], item['available'], item['delivery']))
    
    conn.commit()
    conn.close()

def get_saved_carts():
    conn = sqlite3.connect('flowers.db')
    c = conn.cursor()
    c.execute('''
        SELECT flowerName, flowerImage, prices, stemPrice, color, height, stemsPer, seller, farm, available, delivery
        FROM saved_carts
    ''')
    items = c.fetchall()
    print("Saved carts fetched from database:", items)
    conn.close()

    # DEBUG
    print("Contents of saved_carts table:")
    for item in items:
        print(item)
    
    return items

def clear_saved_carts():
    conn = sqlite3.connect('flowers.db')
    c = conn.cursor()
    c.execute('DROP TABLE IF EXISTS saved_carts')
    with open('sql/schema.sql', 'r') as f:
        c.executescript(f.read())
    conn.commit()
    conn.close()