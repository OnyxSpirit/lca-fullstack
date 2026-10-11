# ERP-09 — REC09-KM

Correction backend: à la restitution, `vehicles.mileage` devient `max(kilométrage courant, kilométrage de sortie)` dans la transaction verrouillée. OR 4: 89 506 km à l'entrée, 89 507 km à la sortie et véhicule à 89 507 km. Une sortie inférieure est refusée. Audit `workshop.vehicle_mileage.updated` créé. Aucun kilométrage historique n'est réécrit.
