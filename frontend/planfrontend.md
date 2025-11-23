# Plan Frontend – Plateforme de pilotage de performance (kpix)

Objectif : concevoir un frontend web simple, efficace et prêt pour la production pour la plateforme de pilotage de la performance, en cohérence avec le backend décrit dans `backend/planbackend.md`.

Contraintes :
- Design minimaliste noir & blanc (typo sobre, pas de distractions).
- UX orientée manager : rapide à lire, rapide à mettre à jour.
- Compatible desktop en priorité (mobile à traiter plus tard).

---

## 1. Stack technique frontend

- Framework : React  – mais le MVP peut démarrer en React + Vite pour simplicité.
- Langage : TypeScript recommandé pour robustesse
- Gestion d’état :
  - MVP : React Query (pour data-fetching) + état local simple pour l’UI.
  - Pas de complexité Redux tant que ce n’est pas nécessaire.
- Routing : React Router ou équivalent.
- HTTP client : `fetch` natif + wrappers pour gérer auth/token.
- Styling :
  - CSS minimal (ou CSS-in-JS léger) avec une palette noir / blanc
  - Système de design simple : variables CSS pour couleurs, tailles, espacements.
- Build : Vite (rapide, standard).
- Auth :
  - Gestion du token (JWT) renvoyé par le backend (stockage en mémoire ou localStorage avec précautions).
  - Garde de routes (protected routes).

> Principe : moins de dépendances, moins de magie. Lisible et facilement refactorable.

---

## 2. Pages et parcours utilisateur (MVP)

### 2.1. Parcours global

Un utilisateur doit pouvoir :
1. Se connecter (login).
2. Accéder à la liste de ses tableaux de bord.
3. Ouvrir un tableau de bord.
4. Voir les KPIs du tableau de bord, leurs statuts, et le graphe d’évolution.
5. Ajouter/modifier des valeurs de KPI.
6. Créer des plans d’action et des commentaires.
7. Accéder à une vue synthétique “direction” (vision globale).

### 2.2. Pages MVP

1. **Login**
   - Formulaire email + mot de passe.
   - Affichage clair des erreurs (texte en rouge sur fond blanc).
   - Après succès : redirection vers “Mes tableaux de bord”.

2. **Tableaux de bord – liste**
   - Titre de la page : “Tableaux de bord”.
   - Liste des dashboards avec :
     - titre,
     - process (ex : “Production”, “Logistique”),
     - statut global (ex : % de KPIs en vert / orange / rouge).
   - CTA “Créer un tableau de bord”.

3. **Tableau de bord – détail**
   - En-tête :
     - nom du tableau de bord,
     - process,
     - résumé des statuts (ex : 5 verts, 3 oranges, 2 rouges).
   - Section KPIs :
     - tableau en noir & blanc :
       - Nom KPI
+       - Dernière valeur
       - Statut (pastille ou badge noir/blanc/grisé selon vert/orange/rouge)
       - Fréquence
       - Actions (voir détails / éditer).
   - Bouton “Ajouter un KPI”.

4. **KPI – détail**
   - En-tête : nom, unité, seuils, fréquence, sens de variation.
   - Bloc “Graphique d’évolution” :
     - pour MVP : simple ligne ou barres avec libellés de période (peut être implémenté avec une librairie légère ou même un pseudo-graphique CSS au début).
   - Bloc “Historique des valeurs” :
     - tableau avec période, valeur, statut.
   - Bloc “Ajouter une valeur” :
     - formulaire : période + valeur.
   - Bloc “Plans d’action” :
     - liste des actions (titre, responsable, avancement %, statut).
     - formulaire simple “Créer une action”.
   - Bloc “Commentaires” :
     - liste des commentaires,
     - zone de texte pour en ajouter un.

5. **Vue direction (overview)**
   - Page synthétique pour la direction :
     - liste des dashboards avec leurs indicateurs clés :
       - % KPIs verts/oranges/rouges,
       - nombre d’actions ouvertes / en retard.
   - Filtre par process / dashboard.

6. **Page “Import” (option MVP +)**
   - Formulaire d’upload de fichier (CSV/Excel).
   - Feedback : progression, statut du job (via API).

---

## 3. Navigation et routing

Routes proposées :

- `/login`
- `/dashboards`
- `/dashboards/:dashboardId`
- `/kpis/:kpiId`
- `/overview`
- `/imports` (optionnel MVP initial)

Principe :
- Routes protégées (requièrent d’être authentifié) pour tout sauf `/login`.
- Redirection de `/` vers `/dashboards` si connecté, sinon `/login`.

---

## 4. Design noir & blanc – principes UI

Palette :
- Fond : blanc (#FFFFFF).
- Texte principal : noir (#000000).
- Texte secondaire / labels : gris foncé (#555555 / #666666).
- Bordures / séparateurs : gris clair (#DDDDDD).
- États des KPI :
  - `GREEN` → badge avec contour noir et fond blanc, texte “VERT”.
  - `ORANGE` → badge avec contour noir, fond blanc, texte “ORANGE”.
  - `RED` → badge avec fond noir, texte blanc “ROUGE”.

Typographie :
- Police sans-serif simple (ex. system font).
- Taille :
  - Titre page : 24px,
  - Sous-titre : 18px,
  - Texte normal : 14–16px.

Composants UI réutilisables :
- `Button` :
  - variant primaire : fond noir, texte blanc.
  - variant secondaire : fond blanc, bordure noire, texte noir.
- `Card` :
  - fond blanc, bordure grise, padding standard.
- `Table` :
  - lignes alternées gris très clair / blanc pour la lisibilité.
- `BadgeStatus` :
  - stylise les états KPI (VERT/ORANGE/ROUGE) en noir & blanc.

Layout :
- Header simple en haut (nom de l’app “kpix”, menu minimal).
- Contenu centré, largeur max (ex. 1200px).
- Sidebar facultative (pour MVP, simple header + navigation horizontale suffisent).

---

## 5. Intégration avec le backend

Services API (couche `api/` côté frontend) :
- `authApi` :
  - `login(credentials) → token`
  - `getMe()`
- `dashboardsApi` :
  - `listDashboards()`
  - `getDashboard(id)`
  - `createDashboard(payload)`
  - `updateDashboard(id, payload)`
- `kpisApi` :
  - `listKpis(dashboardId)`
  - `getKpi(id)`
  - `createKpi(dashboardId, payload)`
  - `updateKpi(id, payload)`
  - `deleteKpi(id)`
- `kpiValuesApi` :
  - `listValues(kpiId)`
  - `createValue(kpiId, payload)`
- `actionsApi` :
  - `listActions(kpiId)`
  - `createAction(kpiId, payload)`
  - `updateAction(id, payload)`
- `commentsApi` :
  - `listCommentsForKpi(kpiId)`
  - `createCommentForKpi(kpiId, payload)`
  - `listCommentsForAction(actionId)`
  - `createCommentForAction(actionId, payload)`
- `importsApi` :
  - `uploadKpiValues(file)`
  - `listJobs()`
  - `getJob(jobId)`
- `reportingApi` :
  - `getOverview()`
  - `getTopRisks()`

Gestion des erreurs :
- Pas de fallback silencieux : message d’erreur clair en haut de la page ou sous le formulaire.
- Logs côté navigateur (console) et éventuellement traçage côté backend si nécessaire.

---

## 6. Structure de projet frontend (suggestion)

Arborescence logique :

- `src/`
  - `app/`
    - `routes.tsx` (définition des routes)
    - `App.tsx` (layout global)
  - `pages/`
    - `LoginPage.tsx`
    - `DashboardsListPage.tsx`
    - `DashboardDetailPage.tsx`
    - `KpiDetailPage.tsx`
    - `OverviewPage.tsx`
    - `ImportsPage.tsx` (optionnel MVP)
  - `components/`
    - `Button.tsx`
    - `Card.tsx`
    - `Table.tsx`
    - `BadgeStatus.tsx`
    - `Layout/Header.tsx`
  - `api/` (clients HTTP)
  - `hooks/` (ex. hooks pour React Query)
  - `styles/`
    - `theme.css` (variables noir/blanc/gris)
    - `global.css`
  - `types/` (types partagés : `Kpi`, `Dashboard`, etc.).

Principes :
- Composants simples, peu imbriqués.
- Responsabilités claires par dossier (pages vs composants).

---

## 7. Itérations de développement (frontend MVP)

### Itération F1 – Skeleton & design system
- Initialiser le projet (Vite + React + TS).
- Mettre en place le layout global (header, container).
- Créer les composants de base : `Button`, `Card`, `Table`, `BadgeStatus`.
- Mettre en place les styles globaux noir & blanc.

### Itération F2 – Auth & routing
- Implémenter la page `Login`.
- Mettre en place les routes protégées.
- Intégrer l’API `auth` (login, me) avec stockage du token.

### Itération F3 – Dashboards & KPIs
- Implémenter la liste des dashboards (`/dashboards`).
- Implémenter la page détail dashboard (`/dashboards/:dashboardId`) avec liste de KPIs.
- Ajouter la création/édition de KPIs (modale ou page dédiée légère).

### Itération F4 – KPI detail & actions
- Implémenter la page détail KPI :
  - historique des valeurs,
  - formulaire d’ajout de valeur,
  - affichage du statut,
  - section plans d’action,
  - section commentaires.

### Itération F5 – Vue direction & imports
- Implémenter la vue `overview` (synthèse direction).
- Implémenter une première version de la page d’import (si le backend est prêt).

---

## 8. Qualité, performance, production

- Gérer le chargement (spinners ou placeholders simples en noir & blanc).
- Gérer les erreurs réseaux avec des messages clairs.
- S’assurer que l’app est utilisable au clavier (tabulation, focus visibles).
- Prévoir une configuration d’environnement (`.env`) pour l’URL de l’API backend.
- Minimiser l’usage de bibliothèques lourdes (notamment graphiques) et commencer avec des solutions simples ; n’ajouter qu’en cas de besoin.

