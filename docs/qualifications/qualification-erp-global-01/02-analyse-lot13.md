# Analyse LOT13

## Reproduction

La première campagne historique avait validé six groupes puis expiré à 300 s. La nouvelle exécution dans un conteneur Node éphémère, relié au réseau privé MySQL 8.4, a fait terminer les trois cas de concurrence. Elle a ensuite exposé une erreur déterministe différente : `Fichier documentaire indisponible` dans le dernier scénario.

## Cause

Le test utilisait :

```sql
SELECT id,file_url,file_hash
FROM documents
WHERE entity_type='delivery'
ORDER BY id
LIMIT 1;
```

Cette dépendance à l'état global choisissait potentiellement un document d'une campagne antérieure dont le fichier se trouvait dans un autre volume GED. La campagne n'était donc pas hermétique. Les transactions, connexions et hooks applicatifs ne sont pas restés bloqués lors de la reproduction instrumentée.

## Correction

Le premier sous-test mémorise désormais l'identifiant du document qu'il vient d'archiver. Le scénario de rollback relit exclusivement ce document et son snapshot. Le délai maximal n'a pas été augmenté et le code applicatif n'a pas été changé.

## Résultat complet

Après correction : 11 tests, 11 réussis, 0 échec, 0 annulé, 0 ignoré, durée totale `59 912 ms`. Durées des cas de concurrence : environ `18,5 s`, `5,3 s` et `4,6 s`. Le scénario de rollback termine en `3,3 s` et vérifie fichier, transaction, snapshot, audit, temps réel et nouvelle tentative.

## CI

La CI de référence n'est pas accessible depuis cette mission. La réserve LOT13 est levée dans l'environnement local isolé uniquement ; aucune réussite CI n'est revendiquée.
