# Rapport pagination et performance

`GET /vehicle-orders` applique le cloisonnement agence avant le comptage, un tri stable `ordered_at DESC, id DESC`, puis `LIMIT/OFFSET`. La réponse utilise le contrat de pagination commun. L'interface emploie `ServerPagination` et invalide les pages après commande/réception. Les cas volume massif et mesure de latence n'ont pas été exécutés ; aucune affirmation de performance chiffrée n'est donc formulée.
