# ERP-11 — Sessions

La désactivation rend immédiatement inutilisable un ancien jeton d’accès (401). La déconnexion révoque le refresh token et son rejeu retourne 401. La réactivation ne ressuscite pas l’ancienne session : une nouvelle authentification est nécessaire.
