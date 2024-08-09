export default {
    routes: [
      {
        method: "POST",
        path: "/user-address/updateUser",
        handler: "api::user-address.user-address.updateUser",
        config:{
          auth:false
        }
      },
      {
        method: "GET",
        path: "/user-address/getUser",
        handler: "api::user-address.user-address.getUser"
      },
    ]
  };