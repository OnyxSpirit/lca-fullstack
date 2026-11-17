# Tests exécutés

- TypeScript backend : réussi.
- TypeScript frontend : réussi.
- `git diff --check` : réussi après normalisation.
- Backend ciblé RBAC/RH/baseline/provisioning/MySQL : 7/7 réussis.
- Frontend ciblé RH/trésorerie : 38/38 réussis.
- Suite frontend globale initiale : 1 047/1 054; les 7 échecs étaient des assertions exigeant l’ancien modèle. Les tests ciblés modifiés réussissent; la suite globale complète n’a pas été relancée après ces corrections.
- Suite backend globale : de nombreux tests réussis, mais exécution interrompue après blocage du runner; plusieurs tests historiques encodent encore l’ancien modèle à quatre scopes.
