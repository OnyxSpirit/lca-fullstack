# Lot 13 — signatures visuelles et cachets

## Architecture et gouvernance

La signature visuelle appartient exclusivement au compte `users`. Elle n'est ni copiée ni rattachée à `employee_profiles`. Une seule version est active grâce à une clé unique générée; remplacement et révocation conservent chaque ancienne version et son fichier privé. L'administration de la signature d'autrui n'est pas fournie implicitement.

Le cachet est un asset institutionnel distinct, rattaché à une concession et facultativement à une agence et un département existants. Aucun nom de service ni rôle n'est codé en dur. Le contexte actuellement autorisé est `DELIVERY_REPORT`. Une seule version d'image est active par cachet et le cachet logique peut être désactivé.

Les assets PNG/JPEG sont stockés via le stockage GED privé existant mais ne sont pas publiés comme documents GED ordinaires. Les routes authentifiées vérifient permission, propriétaire ou scope, taille, extension, MIME et magic bytes, puis servent `private, no-store` et `nosniff`. SVG est refusé. Le SHA-256 identifie l'asset; il n'est pas présenté comme une signature numérique.

Permissions minimales: `signature.view.self`, `signature.manage.self`, `stamp.view`, `stamp.manage`, `stamp.use`, `document.signature.apply`. Le scope `OWN` n'autorise jamais les cachets. Les scopes agence, concession et global suivent le moteur RBAC persistant. Le seed canonique ne crée aucun rôle additionnel et le SUPER_ADMIN système reçoit les permissions par le mécanisme existant.

## Matrice documentaire auditée

| Document | Module / source | Émission et archive | Signature User | Cachet | Décision |
|---|---|---|---|---|---|
| Devis | Commercial / quotation | validation, PDF GED immuable | non démontrée | non démontré | inchangé |
| Bon de commande | Vente | confirmation, PDF GED immuable | non démontrée | non démontré | inchangé |
| Facture | Billing | émission, PDF GED immuable | non démontrée | non démontré | inchangé |
| Reçu paiement | Billing | confirmation, PDF GED immuable | hypothèse seulement | hypothèse seulement | inchangé |
| PV livraison | Delivery | finalisation, PDF GED immuable | facultative | facultatif | intégré |
| Avoir | Billing | émission, PDF GED immuable | non démontrée | non démontré | inchangé |
| PV retour | Return | clôture, PDF GED immuable | non démontrée | non démontré | inchangé |
| OR / SAV | Service | workflows propres, signatures client existantes | non démontrée | non démontré | inchangé |
| RH contrats/congés/primes | RH | aucun PDF officiel Lot 13 démontré | non | non | inchangé |
| Trésorerie / budget | Finance | lecture ou flux financiers | non | non | inchangé |

La signature tactile du client déjà capturée lors de la livraison reste distincte et inchangée. Le Lot 13 ajoute facultativement la version active de la signature de l'utilisateur finalisant et un cachet compatible. L'absence de ces deux assets ne bloque donc pas la livraison.

## Snapshot, archive et historique

La finalisation verrouille la livraison, puis sélectionne les versions actives de la signature et du cachet dans la transaction métier. Les identifiants de versions sont enregistrés dans `delivery_signatures`. Le renderer lit exactement ces fichiers avec vérification de hash. Le PDF final est archivé sous une `source_key` unique; les consultations ultérieures servent cette archive et ne régénèrent pas avec les assets courants. `document_mark_snapshots` conserve document, versions, identités, hashes, acteur, date et contexte, sans dupliquer les blobs.

Le remplacement/révocation d'une signature, le remplacement/désactivation d'un cachet, la désactivation du User ou une modification de l'identité concession ne modifient donc pas un PDF déjà archivé. Une preview ne crée aucun snapshot.

## Verrous et concurrence

Ordre de verrouillage de la finalisation: livraison/vente et ressources métier déjà gelées, signature active du User, cachet actif demandé, puis écritures de livraison. Le remplacement verrouille le User puis sa dernière version; le remplacement de cachet verrouille le cachet puis sa dernière version. Les index uniques `active_user_id`, `active_stamp_id`, `document_id` et la `source_key` GED empêchent plusieurs versions actives, plusieurs snapshots et plusieurs archives du même PV.

Les échecs d'upload avant commit suppriment uniquement le nouveau fichier non référencé. Les anciens assets ne sont jamais supprimés. Les événements significatifs utilisent `audit_logs` Lot 12A avec IDs/version/hash, jamais le binaire ou le base64.

## Migration et limites

La migration additive `069_user_signatures_service_stamps.sql` fait converger l'historique 068 et la baseline fraîche `baseline_001_069`. Elle ne fabrique aucun asset, document ou rôle. Ce lot ne constitue ni une signature électronique qualifiée, ni une PKI, ni une preuve eIDAS. L'extension à d'autres documents exige une règle métier explicite et une migration additive si le contexte doit évoluer.
