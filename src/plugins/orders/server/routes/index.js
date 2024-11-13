module.exports = [
  {
    method: 'POST',
    path: '/',
    handler: 'orderController.getOrders',
    config: {
      policies: [],
    },
  },
  {
    method: 'POST',
    path: '/order',
    handler: 'orderController.getOrder',
    config: {
      policies: [],
    },
  },
  {
    method: 'POST',
    path: '/saveNote',
    handler: 'orderController.saveNote',
    config: {
      policies: [],
    },
  },
  {
    method: 'POST',
    path: '/deleteNote',
    handler: 'orderController.deleteNote',
    config: {
      policies: [],
    },
  },
  
];
