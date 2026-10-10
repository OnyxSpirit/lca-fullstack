# Lot 11B — Congés et absences

Les types sont configurables par concession et conservent leurs snapshots historiques. Les demandes sont liées à `employee_profiles`, jamais obligatoirement à `users`. `EMPLOYEE_REQUEST` distingue le self-service de `HR_ENTRY`.

Le workflow persiste `DRAFT`, `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`. Les dates sont inclusives et la durée exposée est strictement calendaire. Aucun jour ouvré, solde, acquisition, effet salarial, budgétaire ou de trésorerie n'est calculé.

Seul un brouillon est modifiable. Toutes les transitions commencent par identifier la demande sans verrou, puis verrouillent `employee_profiles` avant de verrouiller `employee_leaves`. L'employé est ainsi la première ressource commune aux validations concurrentes, avant la recherche `FOR UPDATE` des chevauchements. L'ordre est `employee_profile → employee_leave → employee_leave_type/document/overlaps`. La création verrouille `employee_profile → employee_leave_type`; la désactivation d'un type verrouille le type. Link/unlink du Lot 10 verrouille le même `employee_profile`, ce qui sérialise le self-service avec une déliaison. Les contrats Lot 11A n'imposent aucune règle bloquante au workflow.

Deux absences approuvées ne peuvent se chevaucher. L'auto-approbation est interdite par le backend. Une correction se fait par annulation auditée puis nouvelle entrée. Les événements realtime ne sont émis qu'après validation de la transaction de création ; le workflow ne produit actuellement aucune notification métier.

Les justificatifs utilisent la GED `employee_leave`. Un type `requires_document` impose au backend un document non archivé avant approbation. Les permissions dédiées et les scopes de l'employé protègent les documents sensibles.

Les contrats Lot 11A restent indépendants : leur présence fournit un contexte, sans blocage légal inventé ni modification. La migration additive est `066_employee_leaves.sql`, sans backfill ni catalogue juridique par défaut.
