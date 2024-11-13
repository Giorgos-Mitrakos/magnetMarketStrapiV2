/*
 *
 * HomePage
 *
 */

import React, { useEffect, useState } from 'react';
// import PropTypes from 'prop-types';
import { Box } from '@strapi/design-system/Box';
import { BaseHeaderLayout } from '@strapi/design-system/Layout';
import { Table, Thead, Tbody, Tr, Td, Th, Checkbox, VisuallyHidden, Link } from '@strapi/design-system';
import { useParams } from "react-router-dom"
import { useFetchClient } from '@strapi/helper-plugin';
import pluginId from '../../pluginId';
import { DesignSystemProvider, Flex, Grid, GridItem, SingleSelect, SingleSelectOption, Typography } from '@strapi/design-system';
import { Button } from '@strapi/design-system/Button';
import Notes from '../../components/Notes';

const OrderPage = () => {

    const { id } = useParams()
    const { post, get, del } = useFetchClient();
    const [order, setOrder] = useState({})
    const [isLoading, setIsLoading] = useState(true)
    const [selectValue, setSelectValue] = useState('')
    const [saving, setSaving] = useState(false);

    const handleNoteChanges = async () => {
        setIsLoading(true);
        const data = await post(`/${pluginId}/order`, { id });

        setOrder(data.data.order);
        setIsLoading(false);
    }


    useEffect(() => {
        const fetchOrder = async () => {
            const data = await post(`/${pluginId}/order`, { id });

            setOrder(data.data.order);
            setIsLoading(false);
        };

        fetchOrder();
    }, [id]);

    useEffect(() => {
        setSelectValue(order.status)
    }, [order]);

    const handleValueChange = (e) => {
        setSelectValue(e)
    }

    const handleSave = async () => {
        setSaving(true)
        if (order.status !== selectValue)
            alert("changed Status")
        // const response = await post(`/${pluginId}/saveMapping`,
        //   {
        //     id,
        //     categoryMapping: importMapping,
        //   });
        setSaving(false)
        // fetchCategoryMapping();
    };

    const totalProductsCost = order.products ? order.products.reduce((total, item) => {
        if (item.is_sale && item.sale_price) {
            return total + item.sale_price * item.quantity
        }
        else {
            return total + item.price * item.quantity
        }
    }, 0) : 0

    return (
        <DesignSystemProvider ><Box background="neutral100">
            <BaseHeaderLayout
                title={`Παραγγελία ${id}`}
                subtitle="Διαχείριση παραγγελίας."
                as="h2"
                primaryAction={<Button onClick={() => handleSave()} loading={saving}>Save</Button>}
            />
            {!isLoading && <Grid gap={{
                large: 5,
                medium: 2,
                initial: 1
            }} background="primary200" marginBottom={10}>
                <GridItem background="neutral100" padding={1} col={9} s={12}>
                    <Grid padding={3} gap={{ large: 5 }}>
                        <GridItem background="neutral100" padding={1} col={4} s={12}>
                            <Grid>
                                <GridItem background="neutral100" padding={1} col={12}>
                                    <Box>
                                        <Typography as="h3" variant="beta">Γενικά</Typography>
                                    </Box>
                                </GridItem>
                                <GridItem background="neutral100" padding={1} col={12}>
                                    <Box>
                                        <Typography as="h4" variant="omega">Ημερομηνία δημιουργίας:</Typography>
                                    </Box>
                                    <Box>
                                        <Typography textColor="neutral800" fontWeight='bold' variant='epsilon'>{new Date(order.createdAt).toLocaleDateString('el-GR')} {new Date(order.createdAt).toLocaleTimeString('el-GR')}</Typography>
                                    </Box>
                                    <Box>
                                        <Typography as="h4" variant="omega">Κατασταση:</Typography>
                                    </Box>
                                    <Box paddingTop={2} paddingRight={5}>
                                        <SingleSelect size="S" value={selectValue} onValueChange={(e) => handleValueChange(e)}>
                                            <SingleSelectOption value="Εκκρεμεί πληρωμή">Εκκρεμεί πληρωμή</SingleSelectOption>
                                            <SingleSelectOption value="Σε επεξεργασία">Σε επεξεργασία</SingleSelectOption>
                                            <SingleSelectOption value="Σε αναμονή">Σε αναμονή</SingleSelectOption>
                                            <SingleSelectOption value="Ολοκληρωμένη">Ολοκληρωμένη</SingleSelectOption>
                                            <SingleSelectOption value="Ακυρωμένη">Ακυρωμένη</SingleSelectOption>
                                            <SingleSelectOption value="Επιστροφή χρημάτων">Επιστροφή χρημάτων</SingleSelectOption>
                                            <SingleSelectOption value="Αποτυχημένη">Αποτυχημένη</SingleSelectOption>
                                            <SingleSelectOption value="Πρόχειρο">Πρόχειρο</SingleSelectOption>
                                        </SingleSelect>
                                    </Box>
                                </GridItem>
                            </Grid>
                        </GridItem>
                        <GridItem background="neutral100" padding={1} col={4} s={12}>
                            <Box paddingBottom={2}>
                                <Typography as="h3" variant="beta">Χρέωση</Typography>
                            </Box>
                            {order.billing_address.isInvoice ?
                                <>
                                    <Box>
                                        <Typography as="h3" variant="beta">{order.billing_address.companyName}</Typography>
                                    </Box>
                                    <Box>
                                        <Typography as="h3" variant="beta">{order.billing_address.businessActivity}</Typography>
                                    </Box>
                                    <Box>
                                        <Typography as="h3" variant="beta">{order.billing_address.afm}</Typography>
                                    </Box>
                                    <Box>
                                        <Typography as="h3" variant="beta">{order.billing_address.doy}</Typography>
                                    </Box>
                                </>
                                :
                                <>
                                    <Flex gap={1}>
                                        <Box>
                                            <Typography as="h3" variant="omega">{order.billing_address.firstname}</Typography>
                                        </Box>
                                        <Box>
                                            <Typography as="h3" variant="omega">{order.billing_address.lastname}</Typography>
                                        </Box>
                                    </Flex>
                                </>}
                            <Box>
                                <Typography as="h3" variant="omega">{order.billing_address.street}</Typography>
                            </Box>
                            <Box>
                                <Typography as="h3" variant="omega">{order.billing_address.city}</Typography>
                            </Box>
                            <Box>
                                <Typography as="h3" variant="omega">{order.billing_address.state}</Typography>
                            </Box>
                            <Box>
                                <Typography as="h3" variant="omega">{order.billing_address.country}</Typography>
                            </Box>
                            <Box>
                                <Typography as="h3" variant="omega">Τ.Κ. {order.billing_address.zipCode}</Typography>
                            </Box>
                            <Box paddingTop={2}>
                                <Typography as="h3" variant="omega" fontWeight="bold">Διεύθυνση email:</Typography>
                            </Box>
                            <Box>
                                <Typography as="h3" variant="omega">{order.billing_address.email}</Typography>
                            </Box>
                            <Box paddingTop={2}>
                                <Typography as="h3" variant="omega" fontWeight="bold">Κινητό:</Typography>
                            </Box>
                            <Box>
                                <Typography as="h3" variant="omega">{order.billing_address.mobilePhone}</Typography>
                            </Box>
                            {order.billing_address.telephone &&
                                <>
                                    <Box paddingTop={2}>
                                        <Typography as="h3" variant="omega" fontWeight="bold">Σταθερό</Typography>
                                    </Box>
                                    <Box>
                                        <Typography as="h3" variant="omega">{order.billing_address.mobilePhone}</Typography>
                                    </Box>
                                </>
                            }
                            <Box paddingTop={2}>
                                <Typography as="h3" variant="omega" fontWeight="bold">ΤΙΜΟΛΟΓΙΟ:</Typography>
                            </Box>
                            <Box>
                                <Typography as="h3" variant="omega">{order.billing_address.isInvoice ? "Ναί" : "Όχι"}</Typography>
                            </Box>
                        </GridItem>
                        <GridItem background="neutral100" padding={1} col={4} s={12}>
                            <Box paddingBottom={2}>
                                <Typography as="h3" variant="beta">Αποστολή</Typography>
                            </Box>
                            <Flex gap={1}>
                                <Box>
                                    <Typography as="h3" variant="omega">{order.shipping_address.firstname}</Typography>
                                </Box>
                                <Box>
                                    <Typography as="h3" variant="omega">{order.shipping_address.lastname}</Typography>
                                </Box>
                            </Flex>
                            <Box>
                                <Typography as="h3" variant="omega">{order.shipping_address.street}</Typography>
                            </Box>
                            <Box>
                                <Typography as="h3" variant="omega">{order.shipping_address.city}</Typography>
                            </Box>
                            <Box>
                                <Typography as="h3" variant="omega">{order.shipping_address.state}</Typography>
                            </Box>
                            <Box>
                                <Typography as="h3" variant="omega">{order.shipping_address.country}</Typography>
                            </Box>
                            <Box>
                                <Typography as="h3" variant="omega">Τ.Κ. {order.shipping_address.zipCode}</Typography>
                            </Box>
                            <Box paddingTop={2}>
                                <Typography as="h3" variant="omega" fontWeight="bold">Κινητό:</Typography>
                            </Box>
                            <Box>
                                <Typography as="h3" variant="omega">{order.shipping_address.mobilePhone}</Typography>
                            </Box>
                            {order.shipping_address.telephone &&
                                <>
                                    <Box paddingTop={2}>
                                        <Typography as="h3" variant="omega" fontWeight="bold">Σταθερό:</Typography>
                                    </Box>
                                    <Box>
                                        <Typography as="h3" variant="omega">{order.shipping_address.mobilePhone}</Typography>
                                    </Box>
                                </>
                            }
                        </GridItem>
                        <GridItem paddingTop={5} col={12}>
                            <Table colCount={5} rowCount={order.products.length}>
                                <Thead>
                                    <Tr>
                                        <Th>
                                            <Typography variant="sigma">Προϊόντα</Typography>
                                        </Th>
                                        <Th>
                                            <VisuallyHidden></VisuallyHidden>
                                        </Th>
                                        <Th>
                                            <Typography variant="sigma">Κόστος</Typography>
                                        </Th>
                                        <Th>
                                            <Typography variant="sigma">Ποσότητα</Typography>
                                        </Th>
                                        <Th>
                                            <Typography variant="sigma">Σύνολο</Typography>
                                        </Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {order.products.map(product => (
                                        <Tr key={product.id}>
                                            <Td>
                                                <img src={product.image} height={64} width={64} />
                                            </Td>
                                            <Td>
                                                <Grid>
                                                    <GridItem col={12}>
                                                        <Typography textColor="neutral800" ellipsis>{product.name}</Typography>
                                                    </GridItem>
                                                    <GridItem col={12}>
                                                        <Typography textColor="neutral800">Κωδικός: {product.id}</Typography>
                                                    </GridItem>
                                                </Grid>
                                            </Td>
                                            <Td>
                                                {product.is_sale ? <Flex direction="column">
                                                    <Box textAlign="end">
                                                        <Typography textColor="neutral800" textDecoration="line-through">{product.price} €</Typography>
                                                    </Box>
                                                    <Box textAlign="end">
                                                        <Typography textColor="neutral800">{product.sale_price} €</Typography>
                                                    </Box>
                                                </Flex>
                                                    : <Box textAlign="end">
                                                        <Typography textColor="neutral800">{product.price} €</Typography>
                                                    </Box>}
                                            </Td>
                                            <Td>
                                                <Box textAlign="center">
                                                    <Typography textColor="neutral800">{product.quantity}</Typography>
                                                </Box>
                                            </Td>
                                            <Td>
                                                <Typography textColor="neutral800">{parseFloat(Number(product.is_sale && product.sale_price ? product.sale_price : product.price) * Number(product.quantity)).toFixed(2)} €</Typography>
                                            </Td>
                                        </Tr>))}
                                </Tbody>
                            </Table>
                        </GridItem>
                        <GridItem paddingTop={5} col={12}>
                            <Grid>
                                <GridItem col={8}>
                                    <Box paddingBottom={2}>
                                        <Typography as="h3" variant="beta">Κουπόνι(α)</Typography>
                                    </Box>
                                </GridItem>
                                <GridItem col={4}>
                                    <Grid>
                                        <GridItem col={12}>
                                            <Grid>
                                                <GridItem col={8}>
                                                    <Box>
                                                        <Typography as="h3" variant="omega">Υποσύνολο Προϊόντων:</Typography>
                                                    </Box>
                                                </GridItem>
                                                <GridItem col={4}>
                                                    <Box textAlign="end">
                                                        <Typography as="h3" variant="omega">{totalProductsCost} €</Typography>
                                                    </Box>
                                                </GridItem>
                                            </Grid>
                                        </GridItem>
                                        {<GridItem col={12}>
                                            <Grid>
                                                <GridItem col={8}>
                                                    <Box>
                                                        <Flex alignItems="start" gap={2}>
                                                            <Typography as="h3" variant="omega">Μεταφορικά:</Typography>
                                                            <Typography as="h3" variant="omega">({order.shipping.name})</Typography>
                                                        </Flex>
                                                    </Box>
                                                </GridItem>
                                                <GridItem col={4}>
                                                    <Box textAlign="end">
                                                        <Typography as="h3" variant="omega">{order.shipping.cost} €</Typography>
                                                    </Box>
                                                </GridItem>
                                            </Grid>
                                        </GridItem>}
                                        {order.payment.name === "Αντικαταβολή" && <GridItem col={12}>
                                            <Grid>
                                                <GridItem col={8}>
                                                    <Box>
                                                        <Typography as="h3" variant="omega">Αντικαταβολή:</Typography>
                                                    </Box>
                                                </GridItem>
                                                <GridItem col={4}>
                                                    <Box textAlign="end">
                                                        <Typography as="h3" variant="omega">{order.payment.cost} €</Typography>
                                                    </Box>
                                                </GridItem>
                                            </Grid>
                                        </GridItem>}
                                        <GridItem col={12}>
                                            <Grid>
                                                <GridItem col={8}>
                                                    <Box>
                                                        <Typography as="h3" variant="omega">Σύνολο παραγγελίας:</Typography>
                                                    </Box>
                                                </GridItem>
                                                <GridItem col={4}>
                                                    <Box textAlign="end">
                                                        <Typography as="h3" variant="omega">{order.total} €</Typography>
                                                    </Box>
                                                </GridItem>
                                            </Grid>
                                        </GridItem>
                                    </Grid>
                                </GridItem>
                            </Grid>
                        </GridItem>
                    </Grid>
                </GridItem>
                <GridItem background="neutral100" paddingTop={4} col={3} s={12}>
                    <Notes noteChanges={handleNoteChanges} notes={order.comments} />
                </GridItem>
            </Grid>}
        </Box>
        </DesignSystemProvider >
    );
};

export default OrderPage;
