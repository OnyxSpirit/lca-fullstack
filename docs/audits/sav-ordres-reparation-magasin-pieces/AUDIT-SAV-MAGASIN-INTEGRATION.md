# Audit intégration SAV ↔ Magasin

Le devis accepté crée une demande interne unique. La remise physique précède réception SAV et consommation. Les rejouages livraison/réception/retour sont protégés ; seules les pièces retournées et contrôlées en bon état réintègrent le stock. Le devis accepté reste immuable et les compléments sont distincts.

Invariants constatés en recette : aucune ligne livrée au-delà du préparé, reçue au-delà du livré, ou consommée/retournée au-delà du reçu.

Scénarios C–F : validés par tests automatisés spécialisés, mais non exécutés comme E2E navigateur authentifié.

Verdict : **CONFORME AVEC RÉSERVES**.

