# Images de livraison vérifiées

Vérification registry effectuée le 12 octobre 2026. Les références utilisées dans `application/docker-compose.livraison.yml` et les deux `Dockerfile.livraison` sont des digests d'index OCI compatibles `linux/amd64` et `linux/arm64/v8`.

| Image | Digest d'index OCI | Manifeste linux/amd64 contrôlé |
|---|---|---|
| `node:22-bookworm-slim` | `sha256:c3de60bf2f9dd0ac6370e6117950ff62d6e339527e7472301c9c78a017978392` | `sha256:efd0ab5780c2d9ab1f0f869571a00d5edb17793bff4cce4a2792e3eb0ffc7562` |
| `mysql:8.4` (8.4.11 lors du contrôle) | `sha256:6ea90827b1100f8f2ae306a539f86d2c264a26ed435a2a9f75551dd5c3aeb242` | `sha256:80f4933e3835f9dc4d35a28ec500d7986cb4414e6c6821c5461239cb7beb8995` |
| `nginx:1.27-alpine` (1.27.5 lors du contrôle) | `sha256:65645c7bb6a0661892a8b03b89d0743208a18dd2f3f17a54ef4b76fb8e2f2a10` | `sha256:62223d644fa234c3a1cc785ee14242ec47a77364226f1c811d2f669f96dc2ac8` |

Ces empreintes ne dispensent pas l'exploitant de sa politique de renouvellement, de scan de vulnérabilités et de génération de SBOM. Toute actualisation d'image doit faire l'objet d'une requalification contrôlée.
