import sqlite3
conn = sqlite3.connect('birdsound.db')
c = conn.cursor()

# Tabellen
c.execute("SELECT name FROM sqlite_master WHERE type='table'")
print("Tabellen:", [r[0] for r in c.fetchall()])

# Recordings mit GPS
c.execute("SELECT COUNT(*) FROM recordings")
print("Recordings:", c.fetchone()[0])

c.execute("SELECT COUNT(*) FROM recordings WHERE latitude IS NOT NULL")
print("Mit GPS:", c.fetchone()[0])

# Sample
c.execute("SELECT timestamp_utc, latitude, longitude, consensus_species FROM recordings ORDER BY timestamp_utc DESC LIMIT 5")
print("\nLetzte 5 Recordings:")
for r in c.fetchall():
    print(f"  {r[0]} | GPS: {r[1]},{r[2]} | Art: {r[3]}")

# Predictions
c.execute("SELECT COUNT(*) FROM predictions")
print("\nPredictions:", c.fetchone()[0])

# Species Tabelle
c.execute("SELECT COUNT(*) FROM species")
print("Species in DB:", c.fetchone()[0])
