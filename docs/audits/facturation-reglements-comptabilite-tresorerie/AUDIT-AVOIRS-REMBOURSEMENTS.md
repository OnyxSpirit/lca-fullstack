# Audit avoirs, annulations et remboursements

Fonctions présentes : annulation d’une facture non encaissée, avoir plafonné au disponible, remboursement lié à un avoir et à un paiement, annulation d’un paiement, motifs obligatoires, PDF/GED et mouvements Treasury compensatoires.

Les opérations sont transactionnelles, verrouillées et idempotentes. L’historique n’est pas effacé. La recette contient un remboursement complet de 118 000 XAF et aucun avoir actif (`credit_notes=0`) alors qu’un événement comptable `CREDIT_NOTE_ISSUED` existe en `REGULARIZE` : donnée de campagne historique incohérente/incomplète à clarifier, sans la modifier.

Automatisé : réussi. Inspection statique : réussi. Navigateur et téléchargement réel : BLOQUÉS. Verdict : **CONFORME AVEC RÉSERVES DE DONNÉES**.
