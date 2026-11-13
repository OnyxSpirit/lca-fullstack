# Guide d’utilisation documentaire

## Documents centraux existants

Depuis leur écran de détail, utiliser l’action PDF/Imprimer : Devis (`quotations.view`), pro-forma (`proformas.export`), vente (`sales.view`), facture/avoir (`billing.invoice.view`), reçu (`billing.payment.view`), véhicule (`vehicles.view`), OR (`service.order.view`), livraison (`delivery.documents.view`), activité (`activity.view`) et employé (`hr.employees.view`, plus `hr.salary.view` en mode complet). Le navigateur ouvre ou télécharge le PDF ; l’impression passe par son dialogue standard. Les documents émis/finalisés ayant une règle GED sont servis depuis l’archive historique et ne sont pas régénérés.

## Livraison

Chemin : Livraisons > ouvrir une livraison prête. Permissions : `delivery.signature.capture` et `delivery.complete`. Renseigner signataire et kilométrage, confirmer la remise ; le dessin client est facultatif. Un cachet de service peut être choisi si `stamp.use` et `stamp.view` sont accordées. Le bouton finalise, génère le PV et l’archive ; `PV PDF` permet ensuite consultation, téléchargement et impression.

## Grand livre et balance

Chemin : Comptabilité > Grand livre ou Balance > Exporter PDF/XLSX/CSV. Permission : `accounting.advanced.export` (les vues utilisent aussi leurs permissions propres). Endpoints : `/accounting/advanced/export/ledger/:format` et `/accounting/advanced/export/balance/:format`. Le PDF porte l’identité LCA et toutes les pages ; XLSX est destiné au retraitement ; CSV à l’échange sécurisé. Aucun export ne crée ni ne modifie d’écriture.

## Documents réservés

Les fiches prospect/client/visite/essai, inventaire/mouvement véhicule, remboursement/annulation, diagnostic/qualité/restitution, documents magasin, journal/écriture comptable et rapprochement bancaire n’ont pas encore de point d’accès officiel. Ne pas substituer une capture écran à un document officiel et ne pas utiliser un endpoint d’une autre famille. Leur réalisation doit réutiliser le scope métier de l’écran source et définir une règle GED explicite.
