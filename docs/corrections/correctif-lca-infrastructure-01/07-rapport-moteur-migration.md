# Moteur de migration

Le moteur existant est conservé. Un seul fichier moteur change : `mysql-migration-runner.ts`. Défaut démontré : un remplacement de FK homonyme en un seul ALTER échoue sur MySQL 8.4 et son état intermédiaire ne pouvait pas être repris. Une correction uniquement SQL aurait changé l'empreinte/numérotation de l'étape historique et bloqué avant toute migration additive.

L'adaptation parse uniquement un ALTER contenant `DROP FOREIGN KEY` et `ADD CONSTRAINT` de même nom, compare colonnes source/cible et règles, normalise seulement l'équivalence MySQL `NO ACTION`/`RESTRICT`, puis exécute les phases. Toute ambiguïté reste bloquante. Les chemins ordinaires, journaux, checksums, verrou, baseline et bootstrap sont inchangés.
