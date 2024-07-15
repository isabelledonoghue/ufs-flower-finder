import sqlite3

def setup_database():
    conn = sqlite3.connect('flowers.db')
    c = conn.cursor()
    with open('sql/schema.sql', 'r') as f:
        c.executescript(f.read())
    conn.commit()
    conn.close()

def insert_data(data):
    conn = sqlite3.connect('flowers.db')
    c = conn.cursor()
    c.executemany('''
        INSERT INTO flowers (
            flower_name, flower_image, price, color, height, stemsPer, seller, farm, availability, delivery
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', data)
    conn.commit()
    conn.close()

if __name__ == "__main__":
    setup_database()