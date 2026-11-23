# Audit des politiques documentaires

## Types gérés

Seuls `QUOTATION`, `SALE_ORDER`, `INVOICE` et `PAYMENT_RECEIPT` ont `policyManaged:true`. Les autres types déclarés utilisent un workflow explicite ou ne sont pas intégrés.

## Persistance

Le `PUT` valide le type, l’agence active, le cachet actif/partagé/éligible, puis effectue un `INSERT ... ON DUPLICATE KEY UPDATE`. L’unicité est concession + agence normalisée + type. Deux documents ne peuvent donc pas s’écraser mutuellement.

## Perte après actualisation — cause démontrée

Le `GET /document-marks/policies` appelle `scope(..., 'usable')`, qui construit un `EXISTS` sur `service_stamp_agencies` avec `sa_scope.stamp_id=st.id`. Le code remplace ensuite textuellement `st.` par `p.`, produisant un filtre équivalent à `sa_scope.stamp_id=p.id`. Un identifiant de politique est ainsi comparé à un identifiant de cachet. La ligne enregistrée peut ne pas être renvoyée ; le formulaire se remonte alors avec ses valeurs par défaut.

## Boutons simultanés

`useDocumentMarkAdministration` instancie une seule mutation `savePolicy`. Tous les boutons lisent `admin.savePolicy.isPending`; ils passent donc tous en chargement pendant n’importe quelle sauvegarde. Les écritures backend restent indépendantes, mais le retour visuel ne l’est pas.

## États techniques

`used` provient soit de codes métier internes, soit de `is_used`; dans cette section, la valeur effectivement exposée est surtout `triggerStatus`: `issued`, `confirmed`, etc. L’UI affiche directement `type.triggerStatus` après « État : ». « load confirmed » n’existe pas comme chaîne littérale dans le code audité ; il s’agit vraisemblablement d’une combinaison issue d’un statut chargé/d’une traduction externe, hypothèse à confirmer par capture réseau/UI.

## « Comportement historique »

`resolveDocumentMarks` retourne `null` sans politique active. Les quatre générateurs continuent alors à produire le PDF sans marque automatique. Ce comportement préserve l’émission antérieure au moteur de politiques, mais autorise donc explicitement un document sans signature ni cachet malgré l’existence de cachets configurés.
