PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS flowers (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    flower_name TEXT NOT NULL,
    flower_image TEXT,
    prices TEXT,
    color TEXT,
    height TEXT,
    stemsPer TEXT,
    seller TEXT,
    farm TEXT,
    availability TEXT,
    delivery TEXT
);