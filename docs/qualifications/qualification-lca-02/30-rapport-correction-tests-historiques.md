# Correction des tests historiques

Backend : attentes de création OR directe remplacées par le flux diagnostic accepté ; page unique PDF remplacée par contrôle multipage ; compteur pro forma aligné sur 9 routes.

Frontend : 10 contrôles alignés sur pro forma, permissions actuelles, rémunérations, chargements combinés, paramètres dynamiques, retour d’essai et statut Démonstration.

Finalisation des intégrations : les anciens scénarios SAV ne recréent plus un OR par l’API interdite ; ils prouvent le refus, puis matérialisent explicitement l’état historique nécessaire à la qualification des opérations aval. Les fixtures RBAC couvrent la décision 2FA actuelle et les gardes de base reconnaissent le nom générique d’intégration isolée.
