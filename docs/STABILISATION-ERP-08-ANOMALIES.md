# ERP-08 — Anomalies

1. Corrigé : facture atelier avec `tax_rate_snapshot=0` malgré lignes taxées.
2. Corrigé : pied de page PDF multipage susceptible de déborder.
3. Donnée de recette : OR 1 contient une ligne main-d’œuvre non liée créée lors du diagnostic initial du script, puis la ligne correctement liée ; la facture 8 reflète les deux. Ce cas est conservé et clairement isolé.
4. Réserve : la remise atelier ne met pas à jour `vehicles.mileage`; les kilométrages réception/remise restent toutefois tracés sur l’OR et le handover.
