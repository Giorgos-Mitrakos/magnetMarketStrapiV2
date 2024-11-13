export default {
    routes: [
      {
        method: "POST",
        path: "/shipping/findShippingCost",
        handler: "api::shipping.shipping.findShippingCost",
        config:{
          auth:false
        }
      },
      {
        method: "POST",
        path: "/shipping/findPaymentCost",
        handler: "api::shipping.shipping.findPaymentCost",
        config:{
          auth:false
        }
      },
      {
        method: "POST",
        path: "/shipping/findCartTotal",
        handler: "api::shipping.shipping.findCartTotal",
        config:{
          auth:false
        }
      },

      
    //   {
    //     method: "GET",
    //     path: "/shipping/getUser",
    //     handler: "api::shipping.shipping.getUser"
    //   },
    ]
  };