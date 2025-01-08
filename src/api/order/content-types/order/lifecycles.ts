export default {
    async afterCreate(event) {
        const { result } = event

        interface IBilling {
            companyName: string
            businessActivity: string
            afm: string
            doy: string
            lastname: string
            firstname: string
            country: string
            state: string
            street: string
            zipCode: string
            mobilePhone: string
            telephone: string
        }

        interface IShipping {
            lastname: string
            firstname: string
            country: string
            state: string
            street: string
            zipCode: string
            mobilePhone: string
            telephone: string
        }

        interface IOrderProduct {
            id: string,
            name: string
            slug: string
            image: string
            price: number,
            weight: number,
            is_sale: boolean,
            quantity: number,
            sale_price: number,
            isAvailable: boolean
        }

        const order = await strapi.entityService.findOne('api::order.order', result.id, {
            populate: {
                user: true,
                shipping: true,
                payment: true,
                comments: true
            },
        })

        const billing = order.billing_address.valueOf() as IBilling
        const shipping = order.shipping_address.valueOf() as IShipping
        const products = order.products.valueOf() as IOrderProduct[]

        const productsRows = products.map(product => (
            `<tr>
                <td><img style="width:30px; height:30px" src='http://localhost:1337${product.image}'><img></td>
                <td style="text-align: left;">${product.id}</td>
                <td style="text-align: left;">${product.name}</td>
                <td style="text-align: left;">${product.quantity}</td>
                <td style="text-align: left;">${product.price} €</td>
                <td style="text-align: left;">${product.quantity * product.price} €</td>
            </tr>`
        ))

        const productsCost = products.reduce((total, item) => {
            return total + item.price * item.quantity
        }, 0)

        const subTable = `
        <div style="width:100%; margin-top:2rem; display:flex; font-weight:bold; font-size: 1rem; flex-direction:column; align-items:flex-end;">
            <p>Υποσύνολο: ${productsCost} €</p>
            <p>${order.shipping.name}: ${order.shipping.cost} €</p>
            <p>${order.payment.name}: ${order.payment.cost} €</p>
            <p>Σύνολο: ${order.total} €</p>
        </div>
        `

        const orderDetailsTable = `
        <section style="width:100%; margin-top:2rem;  display: grid; grid-template-columns: auto auto auto;">
            <div>
                <h2>ΣΤΟΙΧΕΙΑ ΤΙΜΟΛΟΓΗΣΗΣ</h2>
                ${order.isInvoice ?
                `
                <p>Εταιρία: ${billing.companyName}</p>
                <p>Δραστηριότητα: ${billing.businessActivity}</p>
                <p>Α.Φ.Μ.: ${billing.afm}</p>
                <p>Δ.Ο.Υ.: ${billing.doy}</p>
                `
                :
                `
                <p>Επίθετο: ${billing.lastname}</p>
                <p>Όνομα: ${billing.firstname}</p>                
                `
            }
                <p>Χώρα: ${billing.country}</p>
                <p>Νομός: ${billing.state}</p>
                <p>Οδός: ${billing.street}</p>
                <p>Τ.Κ.: ${billing.zipCode}</p>
                <p>Κινητό: ${billing.mobilePhone}</p>
                <p>Σταθερό: ${billing.telephone}</p>
            </div>
            <div>
                <h2>ΠΑΡΑΔΟΣΗ</h2>
                <p>Επίθετο: ${shipping.lastname}</p>
                <p>Όνομα: ${shipping.firstname}</p>
                <p>Χώρα: ${shipping.country}</p>
                <p>Νομός: ${shipping.state}</p>
                <p>Οδός: ${shipping.street}</p>
                <p>Τ.Κ.: ${shipping.zipCode}</p>
                <p>Κινητό: ${shipping.mobilePhone}</p>
                <p>Σταθερό: ${shipping.telephone}</p>
            </div>
            <div>
                <h2>ΣΧΟΛΙΑ</h2>
                <p>${order.delivery_notes}</p>
            </div>
        </section>`

        const orderProductsTable = `
        <section style="width:100%; margin-top:2rem;">
        <table>
            <colgroup>
                <col span="1" style="width: 10%;">
                <col span="1" style="width: 10%;">
                <col span="1" style="width: 50%;">
                <col span="1" style="width: 10%;">
                <col span="1" style="width: 10%;">
                <col span="1" style="width: 10%;">
            </colgroup>
            <tr>
                <th style="text-align: left;">Φώτο</th>
                <th style="text-align: left;">Κωδικός</th>
                <th style="text-align: left;">Προιόν</th>
                <th style="text-align: left;">Ποσότητα</th>
                <th style="text-align: left;">Τιμή</th>
                <th style="text-align: left;">Σύνολο Προιόντος</th>
            </tr>
           ${productsRows}
        </table>
        </section>
       `

        let htmltext = '';

        switch (order.status) {
            case 'Σε αναμονή':
                htmltext = `Ευχαριστούμε για την παραγγελία!</br>Έχουμε <strong>παραλάβει</strong> την παραγγελία σας με αριθμό <strong>#${result.id}</strong> και αναμένεται να επεξεργαστεί από άνθρωπο μας. </br>Θα ενημερωθείτε <strong>άμεσα</strong> όταν επεξεργαστεί με νέο μήνυμα. Μείνετε συντονισμένοι!`;
                break;
            case 'Εκκρεμεί πληρωμή':
                htmltext = `Έχουμε <strong>παραλάβει</strong> την παραγγελία σας με αριθμό <strong>#${result.id}</strong> και αναμένεται η πληρωμή πρίν επεξεργαστεί από άνθρωπο μας. </br>Θα ενημερωθείτε <strong>άμεσα</strong> όταν επεξεργαστεί με νέο μήνυμα. Μείνετε συντονισμένοι!`;
                break;
            case 'Σε επεξεργασία':
                htmltext = `Έχουμε <strong>παραλάβει</strong> την παραγγελία σας με αριθμό <strong>#${result.id}</strong> και επεξεργάζετε από άνθρωπο μας. </br>Θα ενημερωθείτε <strong>άμεσα</strong> όταν ολοκληρωθεί με νέο μήνυμα. Μείνετε συντονισμένοι!`;
                break;
            case 'Ολοκληρωμένη':
                htmltext = `Η παραγγελία σας με αριθμό <strong>#${result.id}</strong> έχει <strong>ολοκληρωθεί</strong> και  έχει εκδοθεί το κατάλληλο παραστατικό.Ευχαριστούμε για την προτίμησή σας!`;
                break;
            case 'Ακυρωμένη':
                htmltext = `Η παραγγελία σας με αριθμό <strong>#${result.id}</strong> έχει <strong>ακυρωθεί</strong>.`;
                break;
            case 'Επιστροφή χρημάτων':
                htmltext = `Η παραγγελία σας με αριθμό <strong>#${result.id}</strong> έχει <strong>ακυρωθεί</strong>. Και προχωρήσαμε στην επιστροφή χρημάτων`;
                break;
            case 'Αποτυχημένη':
                htmltext = `Η παραγγελία σας με αριθμό <strong>#${result.id}</strong> έχει <strong>αποτύχει</strong> να ολοκληρώσει την πληρωμή.`;
                break;
            default:
                break;
        }

        const emailTemplate = {
            subject: `Magnetmarket - Η παραγγελία σας με κωδικό #${result.id} είναι σε κατάσταση: ${order.status}!`,
            text: `${htmltext}`,
            html: `${order.status === 'Σε αναμονή' && '<h1>Ευχαριστούμε για την παραγγελία!</h1>'}
              <p>${htmltext}<p>
              ${orderDetailsTable}
              ${orderProductsTable}
              ${subTable}`,
        };

        try {

            await strapi.plugins["email"].services.email.sendTemplatedEmail(
                {
                    from: "info@magnetmarket.gr",
                    to: `${order.user.email}`,
                },
                emailTemplate
            );
        } catch (error) {
            console.log(error)
        }

        const emailOrderNotificationTemplate = {
            subject: `Νέα παραγγελία στο κατάστημα! #${result.id} `,
            text: `${htmltext}`,
            html: `
              ${orderDetailsTable}
              ${orderProductsTable}
              ${subTable}`,
        };

        try {

            await strapi.plugins["email"].services.email.sendTemplatedEmail(
                {
                    from: "info@magnetmarket.gr",
                    to: `info@magnetmarket.gr;giorgos_mitrakos@yahoo.com;kkoulogiannis@gmail.com;`,
                },
                emailOrderNotificationTemplate
            );
        } catch (error) {
            console.log(error)
        }

    },

    async beforeUpdate(event) {
        const order = await strapi.entityService.findOne('api::order.order', event.params.where.id, {
            populate: {
                user: true,
                shipping: true,
                payment: true,
                comments: true
            },
        })
        
        if(event.params.data.status && order.status!==event.params.data.status)
        {
            interface IBilling {
                companyName: string
                businessActivity: string
                afm: string
                doy: string
                lastname: string
                firstname: string
                country: string
                state: string
                street: string
                zipCode: string
                mobilePhone: string
                telephone: string
            }
    
            interface IShipping {
                lastname: string
                firstname: string
                country: string
                state: string
                street: string
                zipCode: string
                mobilePhone: string
                telephone: string
            }
    
            interface IOrderProduct {
                id: string,
                name: string
                slug: string
                image: string
                price: number,
                weight: number,
                is_sale: boolean,
                quantity: number,
                sale_price: number,
                isAvailable: boolean
            }
    
            const billing = order.billing_address.valueOf() as IBilling
            const shipping = order.shipping_address.valueOf() as IShipping
            const products = order.products.valueOf() as IOrderProduct[]
    
            const productsRows = products.map(product => (
                `<tr>
                    <td><img style="width:30px; height:30px" src='http://localhost:1337${product.image}'><img></td>
                    <td style="text-align: left;">${product.id}</td>
                    <td style="text-align: left;">${product.name}</td>
                    <td style="text-align: left;">${product.quantity}</td>
                    <td style="text-align: left;">${product.price} €</td>
                    <td style="text-align: left;">${product.quantity * product.price} €</td>
                </tr>`
            ))
    
            const productsCost = products.reduce((total, item) => {
                return total + item.price * item.quantity
            }, 0)
    
            const subTable = `
            <div style="width:100%; margin-top:2rem; display:flex; font-weight:bold; font-size: 1rem; flex-direction:column; align-items:flex-end;">
                <p>Υποσύνολο: ${productsCost} €</p>
                <p>${order.shipping.name}: ${order.shipping.cost} €</p>
                <p>${order.payment.name}: ${order.payment.cost} €</p>
                <p>Σύνολο: ${order.total} €</p>
            </div>
            `
    
            const orderDetailsTable = `
            <section style="width:100%; margin-top:2rem;  display: grid; grid-template-columns: auto auto auto;">
                <div>
                    <h2>ΣΤΟΙΧΕΙΑ ΤΙΜΟΛΟΓΗΣΗΣ</h2>
                    ${order.isInvoice ?
                    `
                    <p>Εταιρία: ${billing.companyName}</p>
                    <p>Δραστηριότητα: ${billing.businessActivity}</p>
                    <p>Α.Φ.Μ.: ${billing.afm}</p>
                    <p>Δ.Ο.Υ.: ${billing.doy}</p>
                    `
                    :
                    `
                    <p>Επίθετο: ${billing.lastname}</p>
                    <p>Όνομα: ${billing.firstname}</p>                
                    `
                }
                    <p>Χώρα: ${billing.country}</p>
                    <p>Νομός: ${billing.state}</p>
                    <p>Οδός: ${billing.street}</p>
                    <p>Τ.Κ.: ${billing.zipCode}</p>
                    <p>Κινητό: ${billing.mobilePhone}</p>
                    <p>Σταθερό: ${billing.telephone}</p>
                </div>
                <div>
                    <h2>ΠΑΡΑΔΟΣΗ</h2>
                    <p>Επίθετο: ${shipping.lastname}</p>
                    <p>Όνομα: ${shipping.firstname}</p>
                    <p>Χώρα: ${shipping.country}</p>
                    <p>Νομός: ${shipping.state}</p>
                    <p>Οδός: ${shipping.street}</p>
                    <p>Τ.Κ.: ${shipping.zipCode}</p>
                    <p>Κινητό: ${shipping.mobilePhone}</p>
                    <p>Σταθερό: ${shipping.telephone}</p>
                </div>
                <div>
                    <h2>ΣΧΟΛΙΑ</h2>
                    <p>${order.delivery_notes}</p>
                </div>
            </section>`
    
            const orderProductsTable = `
            <section style="width:100%; margin-top:2rem;">
            <table>
                <colgroup>
                    <col span="1" style="width: 10%;">
                    <col span="1" style="width: 10%;">
                    <col span="1" style="width: 50%;">
                    <col span="1" style="width: 10%;">
                    <col span="1" style="width: 10%;">
                    <col span="1" style="width: 10%;">
                </colgroup>
                <tr>
                    <th style="text-align: left;">Φώτο</th>
                    <th style="text-align: left;">Κωδικός</th>
                    <th style="text-align: left;">Προιόν</th>
                    <th style="text-align: left;">Ποσότητα</th>
                    <th style="text-align: left;">Τιμή</th>
                    <th style="text-align: left;">Σύνολο Προιόντος</th>
                </tr>
               ${productsRows}
            </table>
            </section>
           `
    
            let htmltext = '';
    
            switch (event.params.data.status) {
                case 'Σε αναμονή':
                    htmltext = `Ευχαριστούμε για την παραγγελία!</br>Έχουμε <strong>παραλάβει</strong> την παραγγελία σας με αριθμό <strong>#${event.params.where.id}</strong> και αναμένεται να επεξεργαστεί από άνθρωπο μας. </br>Θα ενημερωθείτε <strong>άμεσα</strong> όταν επεξεργαστεί με νέο μήνυμα. Μείνετε συντονισμένοι!`;
                    break;
                case 'Εκκρεμεί πληρωμή':
                    htmltext = `Έχουμε <strong>παραλάβει</strong> την παραγγελία σας με αριθμό <strong>#${event.params.where.id}</strong> και αναμένεται η πληρωμή πρίν επεξεργαστεί από άνθρωπο μας. </br>Θα ενημερωθείτε <strong>άμεσα</strong> όταν επεξεργαστεί με νέο μήνυμα. Μείνετε συντονισμένοι!`;
                    break;
                case 'Σε επεξεργασία':
                    htmltext = `Έχουμε <strong>παραλάβει</strong> την παραγγελία σας με αριθμό <strong>#${event.params.where.id}</strong> και επεξεργάζετε από άνθρωπο μας. </br>Θα ενημερωθείτε <strong>άμεσα</strong> όταν ολοκληρωθεί με νέο μήνυμα. Μείνετε συντονισμένοι!`;
                    break;
                case 'Ολοκληρωμένη':
                    htmltext = `Η παραγγελία σας με αριθμό <strong>#${event.params.where.id}</strong> έχει <strong>ολοκληρωθεί</strong> και  έχει εκδοθεί το κατάλληλο παραστατικό.Ευχαριστούμε για την προτίμησή σας!`;
                    break;
                case 'Ακυρωμένη':
                    htmltext = `Η παραγγελία σας με αριθμό <strong>#${event.params.where.id}</strong> έχει <strong>ακυρωθεί</strong>.`;
                    break;
                case 'Επιστροφή χρημάτων':
                    htmltext = `Η παραγγελία σας με αριθμό <strong>#${event.params.where.id}</strong> έχει <strong>ακυρωθεί</strong>. Και προχωρήσαμε στην επιστροφή χρημάτων`;
                    break;
                case 'Αποτυχημένη':
                    htmltext = `Η παραγγελία σας με αριθμό <strong>#${event.params.where.id}</strong> έχει <strong>αποτύχει</strong> να ολοκληρώσει την πληρωμή.`;
                    break;
                default:
                    break;
            }
    
            const emailTemplate = {
                subject: `Magnetmarket - Η παραγγελία σας με κωδικό #${event.params.where.id} είναι σε κατάσταση: ${event.params.data.status}!`,
                text: `${htmltext}`,
                html: `${event.params.data.status === 'Σε αναμονή' ? '<h1>Ευχαριστούμε για την παραγγελία!</h1>':""}
                  <p>${htmltext}<p>
                  ${orderDetailsTable}
                  ${orderProductsTable}
                  ${subTable}`,
            };
    
            try {
    
                await strapi.plugins["email"].services.email.sendTemplatedEmail(
                    {
                        from: "info@magnetmarket.gr",
                        to: `${order.user.email}`,
                    },
                    emailTemplate
                );
            } catch (error) {
                console.log(error)
            }
        }
    },

}