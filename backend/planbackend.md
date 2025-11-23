# Plan Backend – Plateforme de pilotage de performance (kpix)

Objectif : concevoir un backend robuste, modulaire et prêt production pour une application web de pilotage de la performance (type ABCKPI) avec tableaux de bord, KPIs, plans d’action, collaboration et import de données, sur base PostgreSQL.

---

## 1. Stack technique backend

- Langage : Python 3.11+
- Framework API : FastAPI (ou équivalent async) pour :
  - endpoints REST,
  - validation de schémas (Pydantic),
  - doc auto (OpenAPI).
- DB : PostgreSQL (hébergée managée à terme).
- ORM / Query builder : SQLAlchemy 2.x (async) ou similaire.
- Gestion des dépendances : `uv` (conformément à AGENTS.md).
- Authentification :
  - JWT (access + refresh) ou sessions HTTP (à décider au moment de l’implémentation),
  - hashing de mot de passe (argon2/bcrypt).
- Observabilité :
  - logs structurés (JSON) niveau app,
  - hooks pour traçage et métriques (ex : Prometheus) à prévoir mais pas obligatoires pour le MVP.

> Remarque : aucune fonctionnalité LLM prévue dans le MVP, mais si ajout ultérieur, respecter la règle AGENTS.md : mode local (vLLM) + mode API (provider externe type OpenAI).

---

## 2. Vue métier et fonctionnalités MVP (backend)

Le backend doit permettre à un manager de :
- s’authentifier,
- gérer ses tableaux de bord multi‑processus,
- gérer ses KPIs,
- saisir/importer les valeurs,
- voir le statut (vert/orange/rouge),
- créer des plans d’action,
- collaborer via commentaires,
- partager avec son équipe (gestion simple des droits).

Fonctionnalités MVP côté backend :
1. Authentification (login / signup, rôles basiques).
2. Gestion des utilisateurs et appartenance à une organisation/équipe.
3. Gestion des tableaux de bord (CRUD minimal).
4. Gestion des KPIs (CRUD, configuration complète).
5. Gestion des valeurs de KPI (saisie + lecture + calcul statut).
6. Gestion des plans d’action et commentaires.
7. Import simple (fichier CSV/Excel) pour valeurs de KPI.
8. Exposition d’une vue synthétique “direction” (agrégations simples).

---

## 3. Modèle de données (PostgreSQL – schéma initial MVP)

### 3.1. Principales entités

- `organization`
  - id (PK)
  - name
  - created_at

- `user`
  - id (PK)
  - organization_id (FK → organization.id)
  - email (unique)
  - password_hash
  - full_name
  - role (enum : `ADMIN`, `USER`) – rôle global dans l’organisation
  - is_active (bool)
  - created_at, updated_at

- `team` (optionnel MVP, mais utile pour “partager avec son équipe”)
  - id (PK)
  - organization_id (FK)
  - name
  - created_at

- `team_member`
  - id (PK)
  - team_id (FK → team.id)
  - user_id (FK → user.id)

- `dashboard`
  - id (PK)
  - organization_id (FK)
  - title
  - description
  - process_name (texte libre pour “multi‑processus” : ex. “Production”, “Logistique”…)
  - owner_id (FK → user.id) – créateur, pour droits simples
  - created_at, updated_at

- `kpi`
  - id (PK)
  - dashboard_id (FK → dashboard.id)
  - name
  - unit (ex : `%`, `€`, `nb`)
  - frequency (enum : `WEEKLY`, `MONTHLY`, éventuellement `DAILY`)
  - direction (enum : `UP_IS_BETTER`, `DOWN_IS_BETTER`)
  - threshold_green
  - threshold_orange
  - threshold_red
  - is_active (bool)
  - created_at, updated_at

- `kpi_value`
  - id (PK)
  - kpi_id (FK → kpi.id)
  - period_start (date)
  - period_end (date) — ou dérivée de la fréquence
  - value (numeric)
  - status (enum : `GREEN`, `ORANGE`, `RED`) – calculé côté backend à la création/mise à jour
  - comment (texte court facultatif)
  - created_at

- `action_plan`
  - id (PK)
  - kpi_id (FK → kpi.id)
  - title
  - description
  - owner_id (FK → user.id) – responsable de l’action
  - due_date (date, optionnel)
  - progress (int 0–100)
  - status (enum : `OPEN`, `IN_PROGRESS`, `DONE`, `CANCELLED`)
  - created_at, updated_at

- `comment`
  - id (PK)
  - kpi_id (FK → kpi.id) (optionnel si commentaire lié seulement à un KPI)
  - action_plan_id (FK → action_plan.id) (optionnel)
  - author_id (FK → user.id)
  - content
  - created_at

- `data_import_job`
  - id (PK)
  - organization_id (FK)
  - type (enum : `EXCEL`, `API`)
  - status (enum : `PENDING`, `RUNNING`, `SUCCESS`, `FAILED`)
  - created_by (FK → user.id)
  - created_at, updated_at
  - error_message (texte, nullable)

> Règles simples de gestion des droits : toutes les entités sont scoping par `organization_id` ; un utilisateur ne voit que les données de son organisation.

---

## 4. Architecture logique et modules

Modules backend principaux :

1. `auth`
   - Signup, login, refresh token.
   - Middleware d’authentification (JWT) et récupération de l’utilisateur courant.
   - Gestion basique des rôles : `ADMIN` vs `USER` (ex : seul `ADMIN` peut créer des users).

2. `users` / `organizations` / `teams`
   - CRUD minimal sur utilisateur côté admin (création, activation/désactivation).
   - Endpoints pour récupérer le profil courant.
   - Gestion simple d’une organisation unique par utilisateur dans le MVP.

3. `dashboards`
   - CRUD : créer, lister, afficher un dashboard, mise à jour.
   - Filtrage par organisation ; option : filtrer par `process_name`.

4. `kpis`
   - CRUD : création, liste par dashboard, détail, mise à jour, suppression.
   - Gestion cohérente des seuils et du sens de variation.
   - Validation des fréquences.

5. `kpi_values`
   - Création d’une valeur pour un KPI et période donnée.
   - Règles :
     - calcul du statut (GREEN/ORANGE/RED) basé sur :
       - direction,
       - seuils du KPI,
       - valeur numérique.
     - éviter les doublons (unique constraint sur `(kpi_id, period_start, period_end)`).
   - Lecture :
     - historique complet (liste ordonnée par date),
     - data pour graphique d’évolution.

6. `action_plans`
   - CRUD minimal :
     - création d’une action liée à un KPI,
     - mise à jour de l’avancement (0–100 %),
     - liste des actions d’un KPI.

7. `comments`
   - Création de commentaire lié à un KPI ou une action.
   - Liste des commentaires (par KPI ou par action).

8. `imports`
   - Endpoint pour upload de fichier (CSV/Excel) mappé sur des valeurs de KPI.
   - Stockage du fichier en mémoire ou stockage temporaire (selon contraintes infra).
   - Parsing et validation basique :
     - mapping colonnes → KPI + période + valeur,
     - enregistrement en batch dans `kpi_value`.
   - Journalisation via `data_import_job`.

9. `reporting` / vue direction
   - Endpoints d’agrégation simple :
     - statut global par dashboard,
     - top N KPIs en rouge/orange,
     - nombre d’actions ouvertes / en retard par dashboard ou process.

---

## 5. API REST – endpoints MVP (brouillon)

Notation : préfixe `/api/v1`.

### 5.1. Auth
- `POST /api/v1/auth/signup`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/me`

### 5.2. Dashboards
- `GET /api/v1/dashboards`
- `POST /api/v1/dashboards`
- `GET /api/v1/dashboards/{dashboard_id}`
- `PATCH /api/v1/dashboards/{dashboard_id}`
- (facultatif MVP) `DELETE /api/v1/dashboards/{dashboard_id}`

### 5.3. KPIs
- `GET /api/v1/dashboards/{dashboard_id}/kpis`
- `POST /api/v1/dashboards/{dashboard_id}/kpis`
- `GET /api/v1/kpis/{kpi_id}`
- `PATCH /api/v1/kpis/{kpi_id}`
- `DELETE /api/v1/kpis/{kpi_id}`

### 5.4. Valeurs de KPI
- `GET /api/v1/kpis/{kpi_id}/values` – historique
- `POST /api/v1/kpis/{kpi_id}/values` – ajouter une valeur

### 5.5. Plans d’action
- `GET /api/v1/kpis/{kpi_id}/actions`
- `POST /api/v1/kpis/{kpi_id}/actions`
- `PATCH /api/v1/actions/{action_id}`

### 5.6. Commentaires
- `GET /api/v1/kpis/{kpi_id}/comments`
- `POST /api/v1/kpis/{kpi_id}/comments`
- `GET /api/v1/actions/{action_id}/comments`
- `POST /api/v1/actions/{action_id}/comments`

### 5.7. Import de données
- `POST /api/v1/imports/kpi-values` – upload fichier (CSV/Excel)
- `GET /api/v1/imports/jobs` – liste des imports
- `GET /api/v1/imports/jobs/{job_id}`

### 5.8. Vue direction / reporting
- `GET /api/v1/reporting/overview` – synthèse par dashboard/process
- `GET /api/v1/reporting/top-risks` – KPIs en rouge/orange
- `GET /api/v1/reporting/direction` – vue Direction (top KPIs rouges, tendances, actions clés)

---

## 6. Sécurité, droits et multi‑organisation

- Chaque requête authentifiée est contextée par l’utilisateur courant (et donc son `organization_id`).
- Toutes les requêtes de lecture/écriture filtrent systématiquement sur `organization_id`.
- Règles simples MVP :
  - `ADMIN` :
    - crée des utilisateurs dans son organisation,
    - peut voir tous les dashboards de l’organisation.
  - `USER` :
    - voit les dashboards auxquels il a accès (par défaut tous dans l’organisation dans le MVP),
    - peut créer/modifier ses propres dashboards/KPIs/actions.
- Logs :
  - journaliser les actions sensibles : login, création/suppression de KPI, création d’action, import de données (avec résultat).

---

## 7. Itérations de développement (MVP)

### Itération 1 – Auth & base de données
- Mettre en place le projet backend (FastAPI + uv + PostgreSQL).
- Créer le schéma minimal : `organization`, `user`.
- Implémenter signup, login, me, et middlewares d’auth.

### Itération 2 – Dashboards & KPIs
- Modéliser `dashboard`, `kpi`.
- Endpoints CRUD pour dashboards.
- Endpoints CRUD pour KPIs dans un dashboard.

### Itération 3 – Valeurs et statut KPIs
- Modéliser `kpi_value`.
- Endpoint de création de valeur + calcul du statut vert/orange/rouge.
- Endpoint de récupération d’historique pour les graphiques.

### Itération 4 – Plans d’action & commentaires
- Modéliser `action_plan` et `comment`.
- Endpoints pour créer/lister les actions d’un KPI.
- Endpoints pour créer/lister les commentaires.

### Itération 5 – Import de données & vue direction
- Modéliser `data_import_job`.
- Endpoint d’upload fichier (CSV/Excel simple).
- Traitement de base pour ingérer des valeurs de KPI.
- Endpoints d’agrégation pour la vue synthétique direction.

---

## 8. Principes de qualité et production

- Pas de mécanisme de fallback silencieux : les erreurs d’import ou de calcul de statut doivent être retournées clairement (HTTP 4xx/5xx) et loguées.
- Logs significatifs, surtout :
  - authentification,
  - écriture de données (KPIs, valeurs, actions),
  - imports.
- Code modulaire par domaine (auth, dashboards, kpis, values, actions, imports, reporting).
- Dès que l’implémentation commence, prévoir :
  - migrations DB (ex : Alembic),
  - fixtures minimales pour tests,
  - tests unitaires sur les règles métier critiques (calcul statut KPI).
