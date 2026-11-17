# Tests RBAC

Fixtures créées : super administrateur, six profils, deux agences et affectations multi-agences.

La recette `financial-e2e-rbac.mjs` a validé les appels directs Facturation, Trésorerie et Comptabilité pour les six profils : tous les codes observés correspondent aux codes attendus (200 ou 403). L’agent de facturation possède `FIN_AGENT_FACTURATION` en agence BZV et `FIN_SANS_PERMISSION` en agence PNR. Après changement d’agence, les permissions passent à zéro et l’appel Facturation retourne 403. Après révocation de PNR, la session revient sur BZV et la sélection directe de PNR retourne 403 ; la réactivation finale est confirmée.

Le navigateur a confirmé les surfaces autorisées, les routes financières représentatives et le changement d’agence sur les parcours ciblés. La preuve exhaustive par profil est portée par l’API officielle ; une matrice navigateur action par action pour chacun des six profils reste une extension nécessaire uniquement pour obtenir la mention « sans réserve ».
