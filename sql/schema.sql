PRAGMA foreign_keys = ON;

CREATE TABLE flowers (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    flowerName TEXT NOT NULL, 
    flowerImage TEXT,
    prices TEXT,
    stemPrice TEXT,
    color TEXT,
    height TEXT,
    stemsPer TEXT,
    seller TEXT,
    farm TEXT,
    available TEXT,
    delivery TEXT
);

CREATE TABLE shopping_list (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flower_id INTEGER,
    FOREIGN KEY (flower_id) REFERENCES flowers(id)
);

CREATE TABLE IF NOT EXISTS saved_carts (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    flowerName TEXT NOT NULL,
    flowerImage TEXT,
    prices TEXT,
    stemPrice TEXT,
    color TEXT,
    height TEXT,
    stemsPer TEXT,
    seller TEXT,
    farm TEXT,
    available TEXT,
    delivery TEXT
);