import { Box } from '@strapi/design-system/Box';
import { Table, Thead, Tbody, Tr, Td, Th, Checkbox, Typography, VisuallyHidden, Link, Flex } from '@strapi/design-system';
import CustomPagination from '../customPagination';
import { useEffect, useState } from 'react';
import { useFetchClient } from '@strapi/helper-plugin';
import pluginId from '../../pluginId';
import { useLocation } from "react-router-dom"

const OrderList = () => {
    const { search } = useLocation();
    const searchParams = new URLSearchParams(search)
    const ROW_COUNT = 10;
    const COL_COUNT = 8;
    const { post, get, del } = useFetchClient();
    const [orders, setOrders] = useState([])
    const [totalPages, setTotalPages] = useState(0)
    const [isLoading, setIsLoading] = useState(true)

    const rawPage = parseInt(searchParams.get("page"), 10);
    const page = isNaN(rawPage) ? 1 : rawPage;    

    useEffect(() => {
        const fetchImport = async () => {
            const data = await post(`/${pluginId}`, { page });

            setOrders(data.data.orders);
            const totalPages = Math.ceil(data.data.total / 10)

            setTotalPages(totalPages);

            setIsLoading(false);
        };

        fetchImport();
    }, [page]);

    return (
        <Box padding={8} background="neutral100">
            <Table colCount={COL_COUNT} rowCount={ROW_COUNT}>
                <Thead>
                    <Tr>
                        <Th>
                            <Checkbox aria-label="Select all entries" />
                        </Th>
                        <Th>
                            <Typography variant="sigma">ID</Typography>
                        </Th>
                        <Th>
                            <Typography variant="sigma">ΠΑΡΑΓΓΕΛΙΑ</Typography>
                        </Th>
                        <Th>
                            <Typography variant="sigma">ΗΜΕΡΟΜΗΝΙΑ</Typography>
                        </Th>
                        <Th>
                            <Typography variant="sigma">ΚΑΤΑΣΤΑΣΗ</Typography>
                        </Th>
                        <Th>
                            <Typography variant="sigma">ΤΡΟΠΟΣ ΠΛΗΡΩΜΗΣ</Typography>
                        </Th>
                        <Th>
                            <Typography variant="sigma">ΣΥΝΟΛΟ</Typography>
                        </Th>
                        <Th>
                            <VisuallyHidden>Actions</VisuallyHidden>
                        </Th>
                    </Tr>
                </Thead>
                <Tbody>
                    {!isLoading && orders.map(order =>
                        <Tr key={order.id}>
                            <Td>
                                <Checkbox aria-label={`Select ${order.id}`} />
                            </Td>
                            <Td>
                                <Link to={`/plugins/${pluginId}/${order.id}`}>
                                    <Typography textColor="neutral800">{order.id}</Typography>
                                </Link>
                            </Td>
                            <Td>
                                <Link to={`/plugins/${pluginId}/${order.id}`}>
                                    {order.isInvoice ?
                                        <Typography textColor="neutral800">{order.billing_address.companyName}</Typography> :
                                        <Typography textColor="neutral800">{order.billing_address.firstname} {order.billing_address.lastname}</Typography>
                                    }
                                </Link>
                            </Td>
                            <Td>
                                <Typography textColor="neutral800">{order.createdAt.toLocaleString('el-GR', { timeZone: 'UTC' })}</Typography>
                            </Td>
                            <Td>
                                <Typography textColor="neutral800">{order.status}</Typography>
                            </Td>
                            <Td>
                                <Typography textColor="neutral800">{order.payment.name}</Typography>
                            </Td>
                            <Td>
                                <Typography textColor="neutral800">{order.total}</Typography>
                            </Td>
                        </Tr>
                    )}
                </Tbody>
            </Table>
            <Box paddingTop={2}>
                <Flex paddingTop={2} justifyContent="end">
                    <CustomPagination totalPages={totalPages} active={page ? page : 1} />
                </Flex>
            </Box>
        </Box>
    )
}

export default OrderList