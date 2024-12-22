export default {
  routes: [
    {
      method: "POST",
      path: "/user-address/updateUser",
      handler: "api::user-address.user-address.updateUser",
    },
    {
      method: "POST",
      path: "/user-address/getUser",
      handler: "api::user-address.user-address.getUser"
    },
    {
      method: "GET",
      path: "/user-address/getUserOrders",
      handler: "api::user-address.user-address.getUserOrders"
    },
  ]
};