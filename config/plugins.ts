export default () => ({
  'import-products': {
    enabled: true,
    resolve: './src/plugins/import-products'
  },
  'export-platforms-xml': {
    enabled: true,
    resolve: './src/plugins/export-platforms-xml'
  },
  'platform-scrapper': {
    enabled: true,
    resolve: './src/plugins/platform-scrapper'
  },
  upload: {
    config: {
      providerOptions: {
        localServer: {
          maxage: 300000
        },
      },
    },
  },
});
