import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { transformSync } from '@babel/core'

function localiserTextesJsx() {
  return {
    name: 'magnificat-localiser-textes-jsx',
    enforce: 'pre',
    transform(code, id) {
      const chemin = id.replace(/\\/g, '/').split('?')[0]
      if (!chemin.includes('/src/') || !chemin.endsWith('.jsx')) return null
      const resultat = transformSync(code, {
        filename: id,
        babelrc: false,
        configFile: false,
        parserOpts: { sourceType: 'module', plugins: ['jsx', 'importMeta'] },
        plugins: [function ({ types: t }) {
          const appelTraduction = function (valeur) {
            return t.callExpression(
              t.memberExpression(t.identifier('globalThis'), t.identifier('__magnificatTranslate')),
              [t.stringLiteral(valeur)]
            )
          }
          const traduireExpressionUi = function (node) {
            if (!node) return node
            if (t.isStringLiteral(node)) return appelTraduction(node.value)
            if (t.isConditionalExpression(node)) {
              node.consequent = traduireExpressionUi(node.consequent)
              node.alternate = traduireExpressionUi(node.alternate)
            } else if (t.isLogicalExpression(node) && node.operator === '&&') {
              node.right = traduireExpressionUi(node.right)
            }
            return node
          }
          return {
            visitor: {
              JSXText(path) {
                const raw = path.node.value
                const texte = raw.replace(/\s+/g, ' ').trim()
                if (!texte) return
                const prefixe = /^\s/.test(raw) && !/^\s*\n/.test(raw) ? ' ' : ''
                const suffixe = /\s$/.test(raw) && !/\n\s*$/.test(raw) ? ' ' : ''
                const expr = t.jsxExpressionContainer(appelTraduction(prefixe + texte + suffixe))
                path.replaceWith(expr)
              },
              JSXAttribute(path) {
                const noms = ['aria-label', 'alt', 'label', 'placeholder', 'title']
                if (noms.indexOf(path.node.name.name) === -1 || !t.isStringLiteral(path.node.value)) return
                path.node.value = t.jsxExpressionContainer(appelTraduction(path.node.value.value))
              },
              JSXExpressionContainer(path) {
                const parent = path.parentPath
                if (!parent.isJSXElement() && !parent.isJSXFragment()) return
                path.node.expression = traduireExpressionUi(path.node.expression)
              },
            },
          }
        }],
      })
      return { code: resultat.code, map: resultat.map }
    },
  }
}

// Configuration Vite : le plugin react() active JSX + Fast Refresh.
// Le "proxy" redirige les appels /api/... vers le serveur Django (port 8000)
// pendant le developpement, pour eviter les soucis de CORS.
//
// build.outDir : en production, le build est ecrit directement dans le
// dossier static/ de Django (frontend/), afin qu'une seule application
// (Django + Whitenoise) serve a la fois l'API et l'interface React - pas
// besoin d'un deuxieme hebergement ni de configuration CORS en production.
// base : les chemins des fichiers JS/CSS generes doivent correspondre a
// l'URL sous laquelle Django expose ses fichiers statiques (STATIC_URL).
export default defineConfig({
  plugins: [localiserTextesJsx(), react()],
  base: '/static/frontend/',
  build: {
    outDir: '../gestion_scolaire/static/frontend',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
