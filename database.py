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
    conn.close()
    return items




if __name__ == "__main__":
    setup_database()
