"""Vérifie les fichiers public/data/bloc*.json avant un push.

Usage :  python tools/valider.py
"""
import json
import sys
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "public" / "data"
errors = []

blocs = json.loads((DATA / "blocs.json").read_text(encoding="utf-8"))
for meta in blocs:
    path = DATA.parent / meta["fichier"]
    name = path.name
    try:
        bloc = json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:  # JSON invalide ou fichier manquant
        errors.append(f"{name}: {e}")
        continue

    sections = {s["id"] for s in bloc.get("sections", [])}
    for i, c in enumerate(bloc.get("flashcards", []), 1):
        if not c.get("recto") or not c.get("verso"):
            errors.append(f"{name} carte {i}: recto/verso manquant")
        if c.get("section") not in sections:
            errors.append(f"{name} carte {i}: section inconnue « {c.get('section')} »")
    for i, q in enumerate(bloc.get("quiz", []), 1):
        choix = q.get("choix", [])
        if not q.get("question"):
            errors.append(f"{name} question {i}: texte manquant")
        if len(choix) < 2:
            errors.append(f"{name} question {i}: au moins 2 choix requis")
        if not isinstance(q.get("reponse"), int) or not 0 <= q["reponse"] < len(choix):
            errors.append(f"{name} question {i}: « reponse » doit être l'index (0 = 1er choix)")
        if q.get("section") not in sections:
            errors.append(f"{name} question {i}: section inconnue « {q.get('section')} »")

    print(f"{name}: {len(bloc.get('flashcards', []))} cartes, {len(bloc.get('quiz', []))} questions")

if errors:
    print("\nErreurs :")
    print("\n".join(f"  - {e}" for e in errors))
    sys.exit(1)
print("\nTout est valide.")
