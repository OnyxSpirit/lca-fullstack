# LCA Automotive ERP

Application de gestion intégrée pour concession automobile.

Le système centralise les opérations commerciales, la gestion des véhicules,
l'atelier, les pièces détachées, le SAV, la facturation, les livraisons,
les utilisateurs et les tableaux de bord.

---

# 1. Présentation

LCA Automotive ERP est une plateforme destinée à digitaliser et centraliser
les opérations d'une concession automobile.

L'application permet notamment de gérer :

- les clients
- les prospects
- les ventes de véhicules
- le stock automobile
- les ateliers
- les techniciens
- les pièces détachées
- les ordres de réparation
- le SAV
- les devis
- les factures
- les paiements
- les livraisons
- les utilisateurs
- les rôles et permissions
- les statistiques et tableaux de bord

---

# 2. Objectifs du projet

Les principaux objectifs sont :

- Centraliser les données de la concession.
- Réduire les opérations manuelles.
- Améliorer le suivi des clients.
- Améliorer le suivi des véhicules.
- Optimiser la gestion de l'atelier.
- Assurer la traçabilité des opérations.
- Sécuriser l'accès aux données.
- Fournir des tableaux de bord permettant le pilotage de l'activité.

---

# 3. Modules

## CRM & Prospection

Gestion :

- prospects
- clients
- opportunités
- campagnes
- relances
- historique des interactions

## Stock automobile

Gestion :

- véhicules
- entrées en stock
- sorties
- disponibilité
- immobilisation
- historique des véhicules

## Ventes

Gestion :

- opportunités
- devis
- commandes
- ventes
- commerciaux
- commissions

## Atelier

Gestion :

- rendez-vous
- ordres de réparation
- techniciens
- planning
- postes de travail
- temps d'intervention
- statut des réparations

## Pièces détachées

Gestion :

- catalogue
- stock
- fournisseurs
- commandes fournisseurs
- mouvements de stock
- seuils d'alerte

## SAV

Gestion :

- rendez-vous
- réclamations
- ordres de réparation
- historique client
- garanties

## Facturation

Gestion :

- devis
- factures
- paiements
- échéances
- avoirs

## Livraison

Gestion :

- préparation du véhicule
- contrôle qualité
- documents
- livraison
- remise des clés

## Reporting

Gestion :

- chiffre d'affaires
- ventes
- stock
- atelier
- SAV
- pièces
- performances commerciales

---

# 4. Architecture

L'application est organisée selon une architecture séparant :

- Frontend
- Backend
- Base de données
- Services externes

Architecture générale :

Frontend
   |
   | HTTP / REST API
   |
Backend
   |
   +------ Database
   |
   +------ Services externes

# Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`

// react-example