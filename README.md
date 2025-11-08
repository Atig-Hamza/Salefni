# Salefni

Application web de simulation de crédits et de gestion des demandes pour l'équipe Selefni. Le projet est découpé en deux parties :

- **frontend/** : interface React (Vite) pour les invités et l'espace administrateur.
- **backend/** : API mockée avec `json-server` pour les simulations, demandes et notifications.

## Fonctionnalités clés

- Simulation interactive (mensualité, coût total, TAEG, échéancier simplifié).
- Création de demande de crédit par un invité à partir d'une simulation enregistrée.
- Export PDF du récapitulatif simulation/demande.
- Tableau de bord administrateur avec filtre, recherche, tri et export CSV.
- Gestion complète d'une demande (statut, priorité, notes internes, historique).
- Centre de notifications (badge en en-tête + liste dédiée).

## Prérequis

- Node.js 18+
- npm 9+

## Installation

Installer les dépendances pour les deux dossiers :

```bash
cd backend
npm install

cd ../frontend
npm install
```

## Lancer l'API mock

```bash
cd backend
npm start
```

L'API est disponible sur `http://localhost:3000/api`.

## Lancer le frontend

```bash
cd frontend
npm run dev
```

Le client se connecte automatiquement à `http://localhost:3000/api`. Utiliser la variable d'environnement `VITE_API_URL` pour changer l'URL si nécessaire.

## Accès administrateur

- Email : `admin@selefni.com`
- Mot de passe : `admin`

## Scripts utiles

- `npm run build` (frontend) : build de production Vite.
- `npm run lint` (frontend) : lint du code React.

## Structure des données

- `creditTypes` : types de crédit disponibles et paramètres par défaut.
- `simulations` : simulations enregistrées (historique).
- `applications` : demandes soumises par les invités (liées aux simulations).
- `notifications` : notifications destinées aux administrateurs.

## Tests et vérifications

- Lancer `npm run lint` dans `frontend/` pour vérifier la qualité du code.
- Vérifier manuellement la génération PDF (bouton depuis la page de succès). 

## Personnalisation

- Adapter les styles via `frontend/src/App.css` et `frontend/src/index.css`.
- Modifier les données de départ dans `backend/db.json`.
