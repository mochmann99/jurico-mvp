import pandas as pd

try:
    df = pd.read_csv(CSV_PATH, sep=";", encoding="latin1")
except:
    try:
        df = pd.read_csv(CSV_PATH, sep=",", encoding="latin1")
    except:
        df = pd.read_csv(CSV_PATH, sep="\t", encoding="latin1")

print("Spalten erkannt:", df.columns.tolist())
print("Zeilen:", len(df))
