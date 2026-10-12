# Audit performance et concurrence

## Risques techniques établis

- **AUD-LCA-005** : transition CRM vérifiée avant transaction ; conflit dernier écrivain gagnant.
- **AUD-LCA-009** : filtre GED après limite, faux négatifs avec la volumétrie.
- **AUD-LCA-010** : coupure possible entre mutation documentaire et audit.
- **AUD-LCA-013** : dix connexions par défaut, file illimitée et aucun délai d'acquisition/requête configuré.
- **AUD-LCA-014** : multipart GED intégralement en RAM avec concaténation.
- **AUD-LCA-017** : réponses frontend tardives sans annulation/identité de requête.
- **AUD-LCA-019** : readiness SQL publique partageant le pool métier.
- **AUD-LCA-021** : plusieurs écritures de login sans transaction.

Les verrous et transactions des stocks, factures, encaissements, livraisons, garanties et sessions atelier ont été retrouvés. Aucun test de charge n'a été exécuté et aucun temps de réponse n'est affirmé.

## Comportement potentiel de l'ERP sous forte activité

| Scénario théorique | Composants sensibles | Mécanisme et conséquences probables |
|---:|---|---|
| 10 utilisateurs | CRM, rapports, dashboard, pool 10 | Activité nominale plausible, mais une requête lente par connexion suffit à remplir le pool ; une transition CRM concurrente reste possible. Aucune capacité n'est garantie. |
| 25 utilisateurs | pool/queue, rapports, Socket.IO, PDFs | Les requêtes dépassant les 10 connexions attendent sans borne. Rapports et agrégations peuvent allonger la file ; PDFs lents augmentent la fenêtre inter-session. |
| 50 utilisateurs | uploads GED, dashboards, health, GC Node | Plusieurs fichiers proches de 15 Mio peuvent occuper une part importante des 768 Mio, tandis que la concaténation crée des copies temporaires. Le healthcheck concurrence les appels métier. |
| 100 utilisateurs | tous les précédents, notifications/rooms | File SQL et mémoire deviennent les facteurs architecturaux dominants. Les sockets ne sont pas intrinsèquement fautives à ce volume, mais les rooms périmées multiplient les destinataires erronés. Une validation contrôlée est indispensable. |

Pour tous ces niveaux, CPU, RAM et latence réels dépendent des données, requêtes et hôtes. Aucun seuil de rupture ni temps de réponse n'est déduit.

## Scénarios de validation ultérieure

Dans un environnement isolé : saturation volontaire du pool avec requêtes lentes ; uploads concurrents et aborts ; deux transitions CRM ; rapports/dashboard sur données volumineuses ; rotation/revocation de sockets ; débit Socket.IO et mémoire. Critères : files bornées, 409 sur conflit, 429/503 explicites, absence d'OOM et absence d'événement hors scope.

## Verdict

**Risque modéré à majeur sous forte activité**, dominé par l'absence de backpressure SQL et le buffering GED. Il ne constitue pas une mesure d'incident réel.
