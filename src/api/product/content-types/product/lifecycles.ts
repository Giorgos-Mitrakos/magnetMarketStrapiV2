export default {
    async beforeDelete(event) {
        const { where } = event.params;

        const entry = await strapi.entityService.findOne('api::product.product', where.id, {
            populate: { image: true, additionalImages: true, additionalFiles: true }
        });

        try {
            if (entry.image) {
                const imageEntry = await strapi.db.query('plugin::upload.file').delete({
                    where: { id: entry.image.id },
                });
                // This will delete corresponding image files under the *upload* folder.
                strapi.plugins.upload.services.upload.remove(imageEntry);
            }

            if (entry.additionalImages) {
                for (let addImg of entry.additionalImages) {
                    const imageEntry = await strapi.db.query('plugin::upload.file').delete({
                        where: { id: addImg.id },
                    });
                    // This will delete corresponding image files under the *upload* folder.
                    strapi.plugins.upload.services.upload.remove(imageEntry);
                }
            }

            if (entry.additionalFiles) {
                const fileEntry = await strapi.db.query('plugin::upload.file').delete({
                    where: { id: entry.additionalFiles.id },
                });
                // This will delete corresponding image files under the *upload* folder.
                strapi.plugins.upload.services.upload.remove(fileEntry);
            }

        } catch (error) {
            console.error(error)
        }
    },
    async beforeDeleteMany(event) {
        for (let id of event.params.where.$and[0].id.$in) {
            const entry = await strapi.entityService.findOne('api::product.product', id, {
                populate: { image: true, additionalImages: true, additionalFiles: true }
            });

            try {
                if (entry.image) {
                    const imageEntry = await strapi.db.query('plugin::upload.file').delete({
                        where: { id: entry.image.id },
                    });
                    // This will delete corresponding image files under the *upload* folder.
                    strapi.plugins.upload.services.upload.remove(imageEntry);
                }

                if (entry.additionalImages) {
                    for (let addImg of entry.additionalImages) {
                        const imageEntry = await strapi.db.query('plugin::upload.file').delete({
                            where: { id: addImg.id },
                        });
                        // This will delete corresponding image files under the *upload* folder.
                        strapi.plugins.upload.services.upload.remove(imageEntry);
                    }
                } 

                if (entry.additionalFiles) {
                    const fileEntry = await strapi.db.query('plugin::upload.file').delete({
                        where: { id: entry.additionalFiles.id },
                    });
                    // This will delete corresponding image files under the *upload* folder.
                    strapi.plugins.upload.services.upload.remove(fileEntry);
                }
            } catch (error) {
                console.error(error)
            }

        }

    },
};