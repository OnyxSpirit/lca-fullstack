# Correction de la lecture SQL des politiques

## Cause

La route GET réutilisait le prédicat destiné aux cachets puis remplaçait textuellement l'alias SQL. La jointure `service_stamp_agencies.stamp_id` se retrouvait comparée à `p.id`, identifiant d'une politique sans relation métier.

## Correction

`document-mark.routes.ts` construit désormais un filtre propre aux politiques :

```sql
p.concession_id = ? AND (p.agency_id = ? OR p.agency_id IS NULL)
```

La concession est dérivée du contexte serveur et l'agence vient de la session authentifiée. Le scope exigé reste `AGENCY`. Le fallback concessionnel existant est conservé ; aucun fallback inter-agences n'est ajouté.

## Preuves

Le scénario B3.2.1 enregistre puis relit la politique QUOTATION, répète la lecture, vérifie les valeurs et le cloisonnement depuis une seconde agence. Il impose également que l'identifiant de politique ne corresponde à aucun cachet, ce qui protège contre la réintroduction du défaut.
