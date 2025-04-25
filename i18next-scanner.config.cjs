module.exports = {
  input: [
    'src/**/*.{js,jsx,ts,tsx}', // Scan all JS/TS files in src/
  ],
  output: './locales', // Output directory for translation files
  options: {
    debug: false,
    removeUnusedKeys: false,
    sort: true,
    func: {
      list: ['i18next.t', 'i18n.t', 't'],
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
    },
    trans: {
      component: 'Trans',
      i18nKey: 'i18nKey',
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
      fallbackKey: function(ns, value) {
        return value;
      },
    },
    lngs: ['en'],
    defaultLng: 'en',
    defaultNs: 'translation',
    resource: {
      loadPath: 'locales/{{lng}}/{{ns}}.json',
      savePath: 'locales/{{lng}}/{{ns}}.json',
      jsonIndent: 2,
      lineEnding: '\n',
    },
  },
};
