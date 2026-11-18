# Cartographie générale

Socle : React/TypeScript/Vite, Express/TypeScript, MySQL 8.4, Socket.IO et Nginx. Le frontend contient les domaines Auth, CRM, clients, showroom, véhicules, ventes, devis/proformas, facturation, livraison, SAV/atelier, pièces, RH, fiscalité, trésorerie/comptabilité, reporting, GED, activité, notifications, utilisateurs et paramètres.

Le backend expose les routeurs correspondants sous `backend-node/src/modules`. La base consolidée est matérialisée par `baseline/001_initial_schema.sql`, le seed système et les migrations additives 034 à 132. Le bootstrap applique le baseline puis les migrations sous verrou MySQL avec journal d'étapes et contrôle de checksum.

Les cartographies détaillées historiques restent disponibles dans `docs/audits`; cette qualification vérifie leur état courant au lieu de les considérer comme preuve suffisante.
