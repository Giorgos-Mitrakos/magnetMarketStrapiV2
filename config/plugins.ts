export default () => ({
    'import-products': {
        enabled: true,
        resolve: './src/plugins/import-products'
    },
    'export-platforms-xml': {
      enabled: true,
      resolve: './src/plugins/export-platforms-xml'
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
