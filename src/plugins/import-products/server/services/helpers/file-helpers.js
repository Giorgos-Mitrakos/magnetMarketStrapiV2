'use strict';

const _ = require('lodash');
const Axios = require('axios');
const fs = require('fs');
const stream = require('stream');
const path = require('path');
const { promisify } = require('util');
const mime = require('mime-types');
const sharp = require('sharp');
const pipeline = promisify(stream.pipeline);

module.exports = ({ strapi }) => ({
    async getAndConvertImgToWep(product) {

        try {
            const imageIDS = { mainImage: [], additionalImages: [], imgUrls: [] };
            let index = 0;

            const productName = product.name
                .replaceAll(/[^A-Za-z0-9-_.~]/g, "")
                .replaceAll(/\s+/g, "-")
                .replaceAll("\t", "");

            for (const imgUrl of product.imagesSrc) {
                index += 1;

                let response;
                try {
                    response = await fetch(imgUrl.url);
                    if (!response.ok) continue;
                } catch (err) {
                    console.error("Fetch failed:", imgUrl.url, err);
                    continue;
                }

                let buffer;
                try {
                    const arrayBuffer = await response.arrayBuffer();
                    buffer = Buffer.from(arrayBuffer);
                } catch (err) {
                    console.error("Failed to convert image to buffer:", imgUrl.url, err);
                    break;
                }

                const tmpPath = `./public/tmp/${productName}_${index}.webp`;

                try {
                    const isWindows = process.platform === 'win32';
                    const format = isWindows ? 'jpeg' : 'webp';

                    await sharp(buffer)
                        .resize({ width: 1024 })
                        .toFormat(format)
                        .toFile(tmpPath);

                    const image = await this.upload(tmpPath, "uploads", productName);

                    if (index === 1) {
                        imageIDS.mainImage.push(image.id);
                    } else {
                        imageIDS.additionalImages.push(image.id);
                    }

                    imageIDS.imgUrls.push(imgUrl);
                } catch (err) {
                    console.error("Image processing error:", err, "File:", tmpPath);
                    try {
                        if (fs.existsSync(tmpPath)) {
                            fs.unlinkSync(tmpPath);
                        }
                    } catch (e) {
                        console.log("Failed to clean up:", e);
                    }
                }
            }

            return imageIDS.imgUrls.length ? imageIDS : null;


        } catch (error) {
            console.log("Error in converting Image:", error)
            return null
        }
    },

    async getAdditionalFile(product) {

        try {
            let productName = product.name.replaceAll(/[^A-Za-z0-9-_\.~]/g, "").replaceAll(/[\s+]/g, "-").replace("\t", "");

            let index = 0
            let additionalFileID = [];

            if (product.additional_files && product.additional_files.url && product.additional_files.url !== "") {
                try {
                    const writer = fs.createWriteStream(`./public/tmp/${productName}_${index}.pdf`);
                    const response = await Axios({
                        method: 'get',
                        url: product.additional_files.url,
                        responseType: 'stream'
                    }).then(response => {
                        return new Promise((resolve, reject) => {
                            response.data.pipe(writer);
                            let error = null;
                            writer.on('error', err => {
                                error = err;
                                writer.close();
                                reject(err);
                            });
                            writer.on('close', () => {
                                if (!error) {
                                    resolve(true);
                                }
                                //no need to call the reject here, as it will have been called in the
                                //'error' stream;
                            });
                        });
                    })
                        .then(async () => {
                            const file = await this.upload(`./public/tmp/${productName}_${index}.pdf`, 'uploads', productName);
                            return file
                        }).then((file) => {
                            additionalFileID.push(file.id)
                        })
                        .catch(err => {
                            console.error("Error processing files, let's clean it up", err, "File:", product.name, "supplier Code:", product.supplierCode);
                            try {
                                if (fs.existsSync(`./public/tmp/${productName}_${index}.pdf`)) {
                                    fs.unlinkSync(`./public/tmp/${productName}_${index}.pdf`);
                                }
                            } catch (e) {
                                console.log(e)
                                return
                            }
                        })

                } catch (error) {
                    console.log("Axios Error:", error)
                }
            }

            if (additionalFileID.length === 0) { return }

            return additionalFileID[0]
        } catch (error) {
            console.log("Error in upload additional File:", error)
        }
    },

    async getFileDetails(filePath) {
        return new Promise((resolve, reject) => {
            fs.stat(filePath, (err, stats) => {
                if (err) reject(err.message);
                resolve(stats);
            });
        });
    },

    async deleteFile(filePath) {
        try {
            return new Promise((resolve, reject) => {
                fs.unlink(filePath, (err) => {
                    if (err) reject(err.message);
                    resolve('deleted');
                });
            });

        } catch (error) {
            console.log("Error in deleteFile:", error)
        }
    },

    async uploadToLibrary(imageByteStreamURL) {
        const filePath = './tmp/myImage.jpeg';
        const { data } = await Axios.get(imageByteStreamURL, {
            responseType: 'stream',
        });

        const file = fs.createWriteStream(filePath);
        const finished = promisify(stream.finished);
        data.pipe(file);
        await finished(file);
        const image = await this.upload(filePath, 'uploads');
        return image;
    },

    async upload(filePath, saveAs, productName) {
        const stats = await this.getFileDetails(filePath);
        const fileName = path.parse(filePath).base;

        const res = await strapi.plugins.upload.services.upload.upload(
            {
                data: {
                    fileInfo: {
                        name: productName,
                        caption: productName,
                        alternativeText: productName,
                    },
                    path: saveAs
                },
                files: {
                    path: filePath,
                    name: fileName,
                    type: mime.lookup(filePath),
                    size: stats.size,
                },
            });

        await this.deleteFile(filePath);
        return _.first(res);
    },

    async findNotRelatedFiles() {
        try {
            const products = await strapi.entityService.findMany('api::product.product', {
                fields: ['id'],
                filters: {
                    $or: [
                        { image: { $notNull: true, } },
                        { additionalImages: { $notNull: true, } },
                        { additionalFiles: { $notNull: true, } },
                        { seo: { metaImage: { $notNull: true, } } },
                        { seo: { metaSocial: { image: { $notNull: true, } } } },
                    ]
                },
                populate: {
                    image: true,
                    additionalImages: true,
                    seo: true
                },
            });

            const brands = await strapi.entityService.findMany('api::brand.brand', {
                fields: ['id'],
                filters: {
                    logo: { $notNull: true, },
                },
                populate: {
                    logo: true,
                },
            });

            const categories = await strapi.entityService.findMany('api::category.category', {
                fields: ['id'],
                filters: {
                    image: { $notNull: true, },
                },
                populate: {
                    image: true,
                },
            });

            const payments = await strapi.entityService.findMany('api::payment.payment', {
                fields: ['id'],
                filters: {
                    icon: { $notNull: true, },
                },
                populate: {
                    icon: true,
                },
            });

            const platforms = await strapi.entityService.findMany('api::platform.platform', {
                fields: ['id'],
                filters: {
                    merchantFeeCatalogue: { $notNull: true, },
                },
                populate: {
                    merchantFeeCatalogue: true,
                },
            });

            const shippings = await strapi.entityService.findMany('api::shipping.shipping', {
                fields: ['id'],
                filters: {
                    Regions_file: { $notNull: true, },
                },
                populate: {
                    Regions_file: true,
                },
            });

            const homepage = await strapi.entityService.findOne('api::homepage.homepage', 1, {
                // populate: '*',
                populate: {
                    Carousel: { populate: '*' },
                    fixed_hero_banners: { populate: '*' },
                    body: { populate: '*' },
                }
            });

            const attachedImageIds = []
            for (let product of products) {

                if (product.image) {
                    attachedImageIds.push(product.image.id)
                }

                if (product.additionalImages) {
                    for (let additionalImage of product.additionalImages) {
                        attachedImageIds.push(additionalImage.id)
                    }
                }

                if (product.additionalFiles) {
                    for (let additionalFile of product.additionalFiles) {
                        attachedImageIds.push(additionalFile.id)
                    }
                }

                if (product.seo) {
                    if (product.seo.metaImage) {
                        for (let metaImage of product.seo.metaImage) {
                            attachedImageIds.push(metaImage.id)
                        }
                    }

                    if (product.seo.metaSocial) {
                        if (product.seo.metaSocial.image) {
                            for (let image of product.seo.metaSocial.image) {
                                attachedImageIds.push(image.id)
                            }
                        }
                    }
                }

            }

            for (let brand of brands) {

                if (brand.logo) {
                    attachedImageIds.push(brand.logo.id)
                }

            }

            for (let category of categories) {
                if (category.image) {
                    attachedImageIds.push(category.image.id)
                }
            }

            for (let payment of payments) {
                if (payment.icon) {
                    attachedImageIds.push(payment.icon.id)
                }
            }

            for (let platform of platforms) {
                if (platform.merchantFeeCatalogue) {
                    attachedImageIds.push(platform.merchantFeeCatalogue.id)
                }
            }

            for (let shipping of shippings) {
                if (shipping.Regions_file) {
                    attachedImageIds.push(shipping.Regions_file.id)
                }
            }

            for (let body of homepage.body) {
                if (body.__component === 'homepage.single-banner') {
                    attachedImageIds.push(body.singleBanner.id)
                }
                else if (body.__component === 'homepage.double-banner') {
                    attachedImageIds.push(body.rightBanner.id)
                    attachedImageIds.push(body.leftBanner.id)
                }
                else if (body.__component === 'homepage.triple-banner') {
                    attachedImageIds.push(body.leftTripleBanner.id)
                    attachedImageIds.push(body.middleTripleBanner.id)
                    attachedImageIds.push(body.rightTripleBanner.id)
                }
                else if (body.__component === 'global.carousel') {
                    for (let banner of body.Banner) {
                        attachedImageIds.push(banner.id)
                    }
                    // attachedImageIds.push(body.leftTripleBanner.id)
                    // attachedImageIds.push(body.middleTripleBanner.id)
                    // attachedImageIds.push(body.rightTripleBanner.id)
                }
            }

            const allFiles = await strapi.plugins.upload.services.upload.findMany({});

            for (let file of allFiles) {
                if (!attachedImageIds.includes(file.id)) {
                    await strapi.plugins['upload'].services.upload.remove(file);
                }
            }


        } catch (error) {
            console.log(error)
        }

    }
});
