import sqlite3

def read_db(file_path):
    conn = sqlite3.connect('flowers.db')
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM flowers")  # Adjust the query to your table
    rows = cursor.fetchall()
    
    for row in rows:
        print(row)
    
    conn.close()

read_db('flowers.db')