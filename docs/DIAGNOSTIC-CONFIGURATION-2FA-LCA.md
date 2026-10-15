# Diagnostic de configuration 2FA — ERP LCA

Date : 15 octobre 2026

## Cause exacte

Le message « La double authentification n’est pas configurée sur ce serveur. » est levé exclusivement par `key()` dans `two-factor-crypto.ts` lorsque `env.twoFactor.encryptionKey` est nul. Cette valeur est nulle lorsque `TWO_FACTOR_ENCRYPTION_KEY` est absente ou vide.

Le code applicatif lit correctement la variable, mais le service `backend` de `docker-compose.yml` ne la transmettait pas. L’inspection en lecture seule du conteneur actif `lca-backend-1` confirme que le nom `TWO_FACTOR_ENCRYPTION_KEY` est absent de son environnement. Aucun contenu secret n’a été lu ou affiché.

La création d’un secret d’enrôlement appelle `encryptSecret()`, qui appelle `key()` : l’interface reçoit donc le HTTP 503 et ce message. Il ne s’agit ni d’une erreur TOTP, ni d’une permission RBAC, ni d’une migration absente.

## Correction de configuration préparée

Le service backend reçoit désormais :

```yaml
TWO_FACTOR_ENCRYPTION_KEY: ${TWO_FACTOR_ENCRYPTION_KEY:?TWO_FACTOR_ENCRYPTION_KEY requis}
TWO_FACTOR_KEY_VERSION: ${TWO_FACTOR_KEY_VERSION:-v1}
```

Le caractère obligatoire empêche une future création de conteneur avec une clé absente. Les fichiers `.env.example` racine et backend documentent le format et contiennent uniquement un placeholder, jamais une clé réelle.

La logique métier 2FA et les autres services Docker n’ont pas été modifiés.

## Format attendu

La clé doit représenter exactement 32 octets après décodage Base64, ce qui correspond normalement à une chaîne Base64 de 44 caractères avec terminaison `=`. Le backend refuse au démarrage une valeur fournie dont le décodage ne fait pas 32 octets.

Génération hors dépôt, directement par l’administrateur sur l’hôte cible :

```bash
openssl rand -base64 32
```

La sortie doit être placée dans le `.env` réel non versionné :

```text
TWO_FACTOR_ENCRYPTION_KEY=<sortie générée hors Git>
TWO_FACTOR_KEY_VERSION=v1
```

Le fichier doit rester lisible uniquement par son propriétaire, par exemple avec `chmod 600 .env`. La clé doit également être sauvegardée dans le gestionnaire de secrets administratif : sa perte rendrait les facteurs déjà chiffrés indéchiffrables. Elle ne doit jamais être remplacée sans procédure de rotation/rechiffrement.

Vérification locale sans imprimer la clé :

```bash
test "$(printf '%s' "$TWO_FACTOR_ENCRYPTION_KEY" | base64 -d | wc -c)" -eq 32
```

## État de la migration 087

Contrôles MySQL 8.4 exécutés exclusivement en lecture :

- `schema_migrations` : une entrée version 87 nommée `087_two_factor_authentication.sql` ;
- tables 2FA attendues : 4/4 présentes ;
- colonnes 2FA de `refresh_tokens` : 3/3 présentes ;
- permissions `auth.2fa.*` : 6/6 présentes.

La migration ne doit donc pas être réexécutée. Aucune écriture SQL ni migration n’a été effectuée pendant ce diagnostic.

## Validation

- conteneurs backend, frontend et MySQL observés `healthy` ;
- Compose validé avec une clé factice de test fournie seulement au processus de validation ;
- lint backend réussi ;
- build backend réussi ;
- tests ciblés 2FA et régression des sessions : 2 fichiers sur 2 réussis ;
- `git diff --check` réussi ;
- aucune valeur de secret réelle ajoutée au diff.

Le conteneur actif n’a pas été recréé ou redémarré et reste donc, volontairement, sans la nouvelle variable.

## Activation restante — soumise à autorisation

1. L’administrateur génère une clé hors Git et la sauvegarde dans le gestionnaire de secrets.
2. Il l’ajoute au `.env` réel du projet avec `TWO_FACTOR_KEY_VERSION=v1`.
3. Il valide la configuration sans l’afficher : `docker compose config --quiet`.
4. Après autorisation explicite, il recrée uniquement le backend, sans build et sans dépendances :

   ```bash
   docker compose up -d --no-deps --force-recreate backend
   ```

5. Il vérifie le healthcheck, puis la présence du nom de variable sans afficher sa valeur.
6. Il effectue une activation 2FA de recette et confirme l’audit, le QR/TOTP et les codes de récupération.

Aucune de ces opérations d’activation ou de recréation n’a été exécutée dans cette mission.
