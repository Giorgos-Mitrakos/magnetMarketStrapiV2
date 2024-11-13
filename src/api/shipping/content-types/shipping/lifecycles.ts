const xlsx = require('xlsx');

export default {
    async beforeUpdate(event) {
        const { where, data } = event.params;
        try {
            const entry = await strapi.entityService.findOne('api::shipping.shipping', where.id, {
                populate: { Regions_file: true }
            });

            if (data.Regions_file === null) {

                if (entry.Regions_file) {
                    const imageEntry = await strapi.db.query('plugin::upload.file').delete({
                        where: { id: entry.Regions_file.id },
                    });
                    // This will delete corresponding image files under the *upload* folder.
                    strapi.plugins.upload.services.upload.remove(imageEntry);
                }
            }

        } catch (error) {
            console.log(error)
        }
    },
    async afterUpdate(event) {
        const { result } = event;

        try {
            if (result.Regions_file && result.update_regions) {
                const workbook = xlsx.readFile(`./public${result.Regions_file.url}`)
                let workbook_sheet = workbook.SheetNames;                // Step 3
                let workbook_response = xlsx.utils.sheet_to_json(        // Step 4
                    workbook.Sheets[workbook_sheet[0]]
                );

                const regions = workbook_response.map(x => ({ region: x['Περιοχή'], state: x['Νομός'], postal: x['TK'], disprosito: x['Είδος'] }))

                const Regions_file_ids = []
                for (let region of regions) {
                    let state = region.state
                    switch (region.state) {
                        case 'ΚΟΡΙΝΘΟΥ':
                            state = 'Κορινθίας'
                            break;
                        case 'ΛΑΡΙΣΗΣ':
                            state = 'Λάρισας'
                            break;
                        case 'ΚΑΡΔΙΤΣΗΣ':
                            state = 'Καρδίτσας'
                            break;
                        case 'ΠΕΛΛΗΣ':
                            state = 'Πέλλας'
                            break;
                        case 'ΦΘΙΩΤΙΔΟΣ':
                            state = 'Φθιώτιδας'
                            break;
                        case 'ΦΩΚΙΔΟΣ':
                            state = 'Φωκίδας'
                            break;
                        case 'ΔΩΔ/ΝΗΣΟΥ':
                            state = 'Δωδεκανήσου'
                            break;
                        case 'ΑΙΤΩΛ/ΝΙΑΣ':
                            state = 'Αιτωλοακαρνανίας'
                            break;

                        default:
                            break;
                    }

                    let isDisprositi = false

                    switch (region.disprosito) {
                        case 'ΔΠ':
                            isDisprositi = true
                            break;

                        default:
                            isDisprositi = false
                            break;
                    }
                    const isState = await strapi.db.query('api::state.state').findOne({
                        select: ['name', 'id'],
                        where: { name: state },
                    });

                    const isRegionExists = await strapi.db.query('api::region.region').findOne({
                        select: ['name', 'id'],
                        populate: ['state', 'postal_codes'],
                        where: {
                            $and: [
                                { name: region.region },
                                { state: { id: isState.id } }
                            ]
                        },
                    });

                    if (isRegionExists) {
                        if (!isRegionExists.postal_codes.includes(region.postal)) {
                            const postalCodeId = await strapi.db.query('api::postal-code.postal-code').findOne({
                                select: ['postal', 'id'],
                                where: {
                                    postal: region.postal
                                },

                            })

                            if (!postalCodeId) {
                                await strapi.entityService.create('api::postal-code.postal-code', {
                                    data: {
                                        postal: region.postal,
                                        regions: [{ id: isRegionExists.id }],
                                        publishedAt: new Date()
                                    }
                                })
                            }
                            else {
                                const postalCodes = [...isRegionExists.postal_codes, postalCodeId.id]
                                await strapi.entityService.update('api::region.region', isRegionExists.id,
                                    {
                                        data: {
                                            postal_codes: postalCodes,
                                            publishedAt: new Date()
                                        },
                                    });
                            }

                        }

                        if (isDisprositi)
                            Regions_file_ids.push({ id: isRegionExists.id })
                    }
                    else {
                        const { id: regionId } = await strapi.entityService.create('api::region.region', {
                            data: {
                                name: region.region,
                                state: { id: isState.id },
                                publishedAt: new Date()
                            },
                        });

                        const postalCodeId = await strapi.db.query('api::postal-code.postal-code').findOne({
                            select: ['postal', 'id'],
                            where: {
                                postal: region.postal
                            },

                        })

                        if (!postalCodeId) {
                            await strapi.entityService.create('api::postal-code.postal-code', {
                                data: {
                                    postal: region.postal,
                                    regions: [{ id: regionId }],
                                    publishedAt: new Date()
                                }
                            })
                        }
                        else {
                            await strapi.entityService.update('api::postal-code.postal-code', postalCodeId.id, {
                                data: {
                                    regions: [{ id: regionId }],
                                }
                            })
                        }

                        if (isDisprositi)
                            Regions_file_ids.push({ id: regionId })
                    }
                }

                await strapi.entityService.update('api::shipping.shipping', result.id, {
                    data: {
                        disprosites_perioxes: Regions_file_ids,
                        update_regions: false
                    },
                });
            }
        } catch (error) {
            console.log(error)
        }
    },
}