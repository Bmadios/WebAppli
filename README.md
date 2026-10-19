# Prépa Examen OIQ

Application web (PC + smartphone) de flash cards et de quiz pour préparer l'examen
professionnel de l'Ordre des ingénieurs du Québec, organisée selon les 4 blocs de l'examen :

| Bloc | Thème | Sections |
|------|-------|----------|
| 1 | Système professionnel et développement professionnel | 1.1 – 1.2 |
| 2 | Éthique, déontologie et professionnalisme | 2.1 – 2.6 |
| 3 | Lois et règlements applicables | 3.1 – 3.5 |
| 4 | Normes de pratique professionnelle | 4.1 – 4.9 |

Site 100 % statique (HTML/CSS/JS, aucune dépendance, aucun build) → hébergement
**gratuit** sur Render en « Static Site », sans mise en veille. Installable sur le
téléphone (« Ajouter à l'écran d'accueil ») et utilisable hors-ligne après une 1re visite.

## Structure

```
WebAppli/
├── render.yaml            # Config Render (Blueprint)
├── public/                # ← tout ce qui est publié
│   ├── index.html
│   ├── css/styles.css
│   ├── js/app.js          # Accueil, flash cards, quiz, progression
│   ├── data/
│   │   ├── blocs.json     # Liste des 4 blocs
│   │   └── bloc1..4.json  # Contenu : sections, flash cards, quiz
│   ├── manifest.webmanifest
│   ├── sw.js              # Mode hors-ligne
│   └── icons/icon.svg
└── tools/valider.py       # Vérifie les fichiers de données
```

## Ajouter du contenu

Éditer `public/data/blocN.json` :

```json
"flashcards": [
  { "section": "2.2", "recto": "Question…", "verso": "Réponse…" }
],
"quiz": [
  {
    "section": "2.2",
    "question": "Texte de la question ?",
    "choix": ["A", "B", "C", "D"],
    "reponse": 1,
    "explication": "Pourquoi B est la bonne réponse."
  }
]
```

`reponse` est l'index du bon choix (0 = premier). Les choix sont mélangés à l'affichage.
Ensuite : `python tools/valider.py`.

## Tester en local

```bash
cd public
python -m http.server 8000
```

Ouvrir http://localhost:8000. Pour tester sur le téléphone (même Wi-Fi) :
`http://<IP-du-PC>:8000`.

## Déployer sur Render (gratuit)

1. Créer un repo GitHub puis, depuis ce dossier :
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<utilisateur>/<repo>.git
   git push -u origin main
   ```
2. Sur https://dashboard.render.com : **New → Blueprint**, choisir le repo.
   Render lit `render.yaml` et crée le site statique `oiq-prep`.
   *(Ou : New → Static Site, Build Command vide, Publish Directory `public`.)*
3. Chaque `git push` sur `main` redéploie automatiquement.

## Notes

- La progression (cartes maîtrisées, meilleur score) est stockée dans le navigateur de
  chaque appareil ; elle n'est pas synchronisée entre PC et téléphone.
- Les PDF de l'OIQ sont protégés par droit d'auteur (usage personnel seulement) : ils
  sont exclus par `.gitignore`. Rédiger les cartes et questions dans ses propres mots,
  et garder le repo **privé** si le contenu reprend le document d'étude.
