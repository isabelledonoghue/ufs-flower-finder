PRAGMA foreign_keys = ON;

CREATE TABLE flowers (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    flowerName TEXT NOT NULL, 
    flowerImage TEXT,
    prices TEXT,
    color TEXT,
    height TEXT,
    stemsPer TEXT,
    seller TEXT,
    farm TEXT,
    available TEXT,
    delivery TEXT
);