'use strict';

const _ = require('lodash');
const Axios = require('axios');
const fs = require('fs');
const stream = require('stream');
const path = require('path');
const promisify = require('util').promisify;
const mime = require('mime-types');
const sharp = require('sharp');

module.exports = ({ strapi }) => ({
    async getAndConvertImgToWep(product) {

        try {
            let productName = product.name.replace(/[^A-Za-z0-9-_\s.~]/g, "");

            let index = 0
            const imageIDS = { mainImage: [], additionalImages: [], imgUrls: [] }

            for (let imgUrl of product.imagesSrc) {
                index += 1;
                const sharpStream = sharp({
                    failOnError: false
                });

                try {
                    let cont = false;
                    const response = await Axios({
                        method: 'get',
                        url: imgUrl.url,
                        responseType: 'stream'
                    }).catch(err => {
                        cont = true;
                    })

                    if (cont) {
                        break;
                    }

                    await response && response !== null && response.data.pipe(sharpStream)

                    imageIDS.imgUrls.push(imgUrl)

                    await sharpStream
                        .webp({ quality: 75 })
                        .resize({ width: 1000 })
                        .toFile(`./public/tmp/${productName}_${index}.webp`)
                        .then(async () => {
                            const image = await this.upload(`./public/tmp/${productName}_${index}.webp`, 'uploads', productName);
                            return image
                        })
                        .then((image) => {
                            index === 1 ? imageIDS.mainImage.push(image.id)
                                : imageIDS.additionalImages.push(image.id)
                        })
                        .catch(err => {
                            console.error("Error processing files, let's clean it up", err, "File:", product.name, imgUrl, "supplier Code:", product.supplierCode);
                            try {
                                if (fs.existsSync(`./public/tmp/${productName}_${index}.webp`)) {
                                    fs.unlinkSync(`./public/tmp/${productName}_${index}.webp`);
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

            if (imageIDS.imgUrls.length === 0) { return }

            return imageIDS
        } catch (error) {
            console.log("Error in converting Image:", error)
        }
    },

    async getAdditionalFile(product) {

        try {
            let productName = product.name.replace(/[^A-Za-z0-9-_\s.~]/g, "");

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
                            const file = await this.upload(`./public/tmp/${productName}_${index}.pdf`, 'uploads');
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

            return additionalFileID
        } catch (error) {
            console.log("Error in upload additional File:", error)
        }
    },

    getFileDetails(filePath) {
        return new Promise((resolve, reject) => {
            fs.stat(filePath, (err, stats) => {
                if (err) reject(err.message);
                resolve(stats);
            });
        });
    },

    deleteFile(filePath) {
        return new Promise((resolve, reject) => {
            fs.unlink(filePath, (err) => {
                if (err) reject(err.message);
                resolve('deleted');
            });
        });
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
});
