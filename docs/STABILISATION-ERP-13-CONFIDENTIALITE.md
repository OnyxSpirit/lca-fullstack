# STABILISATION-ERP-13 — Confidentialité

Le salaire est visible par le Super Administrateur et le gestionnaire RH dans son agence. Le compte de l’employé et un profil commercial sans permission reçoivent `403` sur l’historique salarial et sur la liste RH.

Les listes n’ajoutent `current_salary` que lorsque `hr.salary.view` et le scope persistant couvrent le dossier. Aucun montant salarial ne figure dans cette documentation.
