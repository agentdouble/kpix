# kpix frontend

Frontend React/TypeScript (Vite) pour le pilotage de performance en noir & blanc. Les pages principales :
- Login
- Liste des tableaux de bord et détail (KPIs)
- Détail KPI (historique, plans d’action, commentaires)
- Synthèse direction intégrée à la liste des tableaux de bord
- Imports (fichiers CSV/Excel)

## Prérequis

- Node 20+
- Variables d’environnement : voir `.env.example`

## Installation & commandes

```bash
npm install
# mode démo (données locales, pas d’API) :
VITE_USE_DEMO_DATA=true npm run dev
# mode API :
VITE_API_BASE_URL=http://localhost:8000/api/v1 npm run dev
npm run build
npm run preview
```

## Configuration

- `VITE_API_BASE_URL` : URL de l’API backend (ex: http://localhost:8000/api/v1).
- `VITE_USE_DEMO_DATA` : `true` pour utiliser les données locales sans requêtes réseau.
- `FRONTEND_PORT` : port du dev server Vite utilisé par `./start.sh` (défaut 5173, et utilisé pour configurer automatiquement le CORS côté backend).

## Structure

- `src/api` : clients API + mode démo (données locales).
- `src/app` : layout, routing protégé, auth provider.
- `src/components` : UI de base (Button, Card, Table, BadgeStatus).
- `src/pages` : écrans du parcours manager.
- `src/styles` : thème noir & blanc et styles globaux.
