import pandas as pd

CSV_PATH = r"Z:\20.06.2006\Projekte\ChatGPT\manual_export.csv"

def load_csv():
    for sep in [";", ",", "\t"]:
        try:
            df = pd.read_csv(
                CSV_PATH,
                sep=sep,
                encoding="latin1",
                on_bad_lines="skip"
            )
            if len(df.columns) > 1:
                print(f"✅ Erfolgreich geladen mit Separator: '{sep}'")
                return df
        except Exception:
            pass

    raise Exception("❌ CSV konnte nicht gelesen werden")

df = load_csv()

print("Spalten:", df.columns.tolist())
print("Zeilen:", len(df))
print(df.head())
