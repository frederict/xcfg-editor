import { defineConfig } from 'vitest/config'

export default defineConfig({
  /**
   * Chemin relatif, et non `/` ni `/xcfg-editor/`.
   *
   * L'éditeur est servi par GitHub Pages depuis un **sous-chemin** :
   * `https://<compte>.github.io/<dépôt>/`. Avec la valeur par défaut `/`, l'`index.html`
   * réclame `/assets/index-xxxx.js` — la racine du domaine, où GitHub ne sert rien.
   * Résultat : une page blanche, sans message, sans erreur visible ailleurs que dans la
   * console. C'est la panne la plus courante d'un premier déploiement sur Pages.
   *
   * On pourrait écrire `base: '/xcfg-editor/'`. Ce serait faux le jour où le dépôt est
   * renommé, mis derrière un domaine dédié, ou simplement ouvert depuis un `dist/` local.
   * `'./'` fonctionne dans les trois cas : Vite émet alors des URL relatives, et résout
   * les morceaux chargés à la demande depuis `import.meta.url` du morceau qui les
   * demande — ce qui est exactement ce qu'il faut ici, car le catalogue de widgets est
   * partitionné en 33 fichiers par langue chargés par un `import()` au chemin calculé
   * (`src/catalog/widgetCatalog.ts`), plus 34 pour le catalogue d'options. Ces morceaux-là
   * ne sont pas cités dans l'`index.html` : une `base` fausse ne les casse qu'au moment
   * où le pilote choisit sa langue, longtemps après le premier écran.
   *
   * Aucune route côté client dans cette application : rien ne dépend d'un chemin absolu.
   */
  base: './',
  test: { environment: 'happy-dom' }
})
