export default {
    async afterCreate(event) {
        try {
            const { result } = event

            const order = await strapi.entityService.findOne('api::order.order', result.id, {
                populate: {
                    user: true,
                    shipping: true,
                    payment: true,
                    comments: true
                }
            });

            const emailVariables = await strapi.service('api::order.order').sendStatusEmail(order)

            await strapi.service('api::order.order').sendConfirmOrderEmail({ templateReferenceId: 5, to: ['giorgos_mitrakos@yahoo.com', 'info@magnetmarket.gr', 'kkoulogiannis@gmail.com'], emailVariables, subject: `Νέα παραγγελία στο site, Αρ.παρ #${emailVariables.order.id}` })

        } catch (error) {
            console.log(error)
        }
    },
}