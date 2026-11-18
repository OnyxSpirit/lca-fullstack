# Corrections frontend

Les écrans corrigés réutilisent `useClientPagination` et donc `ServerPagination`, avec 10 éléments par défaut et les tailles 10/20/50/100. Les contrôles disparaissent automatiquement lorsqu'ils n'apportent pas de navigation utile selon le comportement du composant partagé.

Agences utilise désormais une grille responsive jusqu'à trois colonnes. Achats directs possède un conteneur horizontal responsive et des états explicites.
