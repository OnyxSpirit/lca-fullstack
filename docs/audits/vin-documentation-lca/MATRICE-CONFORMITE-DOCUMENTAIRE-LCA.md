# Matrice de conformité documentaire LCA

`✓` présent, `~` partiel/variable, `—` absent ou non applicable. La nouvelle exigence de pied rend tous les PDF actuels au mieux partiels.

| Famille / IDs | Identité | En-tête | Pied | Mentions | Signature | Cachet | Pagination | Français | Statut |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Devis, pro-forma, bon commande, factures, reçus, avoirs (001-009) | ✓ | ✓ | ~ | ~ | zone | zone | ✓ | ✓ | Partiel |
| PV livraison (010) | ✓ | ✓ | ~ | ~ | ✓ client + agent | ✓ | ✓ | ✓ | Partiel |
| Planning livraison (011) | ✓ | ✓ | ~ | ~ | — | — | ✓ | ✓ | Partiel |
| Fiche véhicule (012) | ✓ | ✓ | ~ | ~ | — | — | ✓ | ✓ | Partiel |
| OR et devis SAV (013-014) | ✓ | ✓ | ~ | ~ | zone devis | zone | ✓ | ✓ | Partiel |
| Activités (015-016) | ✓ | ✓ | ~ | ~ | — | — | ✓ | ✓ | Partiel |
| Fiches employé (017-018) | ✓ | ✓ | ~ | ~ | — | — | ✓ | ✓ | Partiel |
| PV retour (019) | ✓ | ✓ | ~ | ~ | ~ | ~ | ✓ | ✓ | Partiel |
| Grand livre/balance PDF (020-021) | — | titre seul | — | — | — | — | ~ | ✓ | Non conforme |
| Pilotage financier PDF (022) | texte “ERP LCA” | local | — | — | — | — | ~ | ~ | Non conforme |
| XLSX comptables/reporting (023-028) | — | ~ | — | — | — | — | — | ~ | Non conforme |
| CSV financiers/comptables (029-043) | — | ~ | — | — | — | — | — | ~ | Non conforme |
| CSV reporting métier (044-049) | — | ~ | — | — | — | — | — | ✓ | Non conforme |
| Pièces GED/livraison (050-051) | externe | externe | externe | externe | externe | externe | externe | externe | Non applicable |
| Documents ABS-001 à ABS-018 | — | — | — | — | — | — | — | — | Absents |

## Référence et champs disponibles

| Élément | Source | Usage actuel | Écart |
|---|---|---|---|
| Dénomination sociale | `concessions.legal_name`, fallback `name` | en-tête central | absente du pied |
| Forme juridique | `concessions.legal_form` | en-tête central | absente du pied |
| RCCM | `concessions.rccm` | pied central | conforme mais doit suivre le nom/formе |
| NU/NIU | `concessions.tax_identifier` | libellé `NIU` | vérifier terminologie métier NU/NIU |
| RIB, site, adresse, téléphone | concession/agence | pied central | présents si configurés |
| Logo | `document_logo` | documents centraux | absent des PDF indépendants |
| Signature agent | versions utilisateur | livraison et snapshots | couverture limitée |
| Cachet service | versions/cachets/types | livraison | couverture limitée |
| Signature client | PNG livraison | obligatoire à la finalisation | contraire à la décision cible |

## Comptabilité, SAV et magasin

- Comptabilité : exports structurés et sécurisés, mais seuls grand livre/balance ont un PDF, techniquement sommaire et non officiel.
- SAV : OR/devis SAV bénéficient du meilleur niveau de centralisation après les documents commerciaux. Les documents opérationnels secondaires restent absents.
- Magasin : aucune architecture documentaire officielle utilisée ; seuls tableaux opérationnels et export reporting pièces existent.

## Francisation et sécurité

`financialCsv()` protège l'UTF-8 (BOM), utilise `;`, échappe les guillemets et neutralise `= + - @`. Les exports dédiés ont majoritairement des colonnes françaises. Les exports dynamiques utilisent toutefois `labels[k] ?? k`, et le dashboard pousse les noms internes de sections et clés : une clé inconnue devient visible en anglais. Les formats de dates et montants ne sont pas uniformes entre CSV, XLSX et PDF.
