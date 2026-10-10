# CORR-ERP-02B — Réserves et décisions métier

## CRM-04 — collisions de rendez-vous

Statut : **NON CORRIGÉE**.

Le modèle conserve uniquement `scheduled_at`/`due_at`, sans fin ni durée normative. Inventer 30 ou 60 minutes aurait bloqué arbitrairement des rendez-vous existants. Décision requise : durée par défaut ou heure de fin, définition du chevauchement, statuts exclus, fuseau et politique de forçage. Une future correction devra être transactionnelle et couverte contre les créations concurrentes.

## CRM-05 — auteur des activités

Statut : **NON CORRIGÉE**.

`activities` ne possède pas de champ auteur immuable fiable ; `assigned_user_id` est utilisé historiquement comme acteur dans plusieurs créations. Aucune réinterprétation des anciennes lignes n'a été faite. Une migration additive future devrait introduire `created_by`, renseigner uniquement les nouvelles activités et afficher séparément auteur et responsable.

## API-01 — champs obligatoires

Statut : **NON CORRIGÉE**.

Frontend : prénom + nom pour un particulier et téléphone obligatoire. Backend : nom ou société, puis téléphone ou e-mail. L'API accepte donc e-mail sans téléphone et nom sans prénom, refusés par l'interface. Aucun cas manifestement invalide n'est accepté au regard du contrat backend actuel. Décision requise : contrat commercial canonique et prise en charge des imports/intégrations.

## Autres réserves

- L'identifiant recherché est l'identifiant technique, faute de référence métier prospect existante.
- La détection de doublon est informative et n'empêche pas une course entre créations, conformément à la règle conservatrice.
- Un doublon hors scope n'est pas révélé ; une unicité globale nécessiterait une décision métier distincte.
- Les contrôles clavier ont été couverts statiquement, mais la recette navigateur réelle reste à réaliser sur un bundle isolé.
