import React, { memo, useContext, useEffect, useState } from 'react';
import Plus from '@strapi/icons/Plus';
import Trash from '@strapi/icons/Trash';
import { IconButton } from '@strapi/design-system/IconButton';
import { Box } from '@strapi/design-system/Box';
import { Flex } from '@strapi/design-system/Flex';
import { Table, Thead, Tbody, Tr, Td, Th, TFooter } from '@strapi/design-system/Table';
import { Typography } from '@strapi/design-system/Typography';
import { TextInput } from '@strapi/design-system/TextInput';
import { MappingContext } from '../../pages/Mapping/mappingcontext';
import { Checkbox, SingleSelect, SingleSelectOption, NumberInput } from '@strapi/design-system';

const MappingValues = ({ stockValues }) => {
    const [importMapping, setImportMapping] = useContext(MappingContext)
    const [name_in_xml, setName_in_xml] = useState(stockValues.name_in_xml)
    const [translate_to, setTranslate_to] = useState(stockValues.translate_to)
    const [allow_import, setAllow_import] = useState(stockValues.allow_import)

    // Ο πίνακας με τις τιμές από το schema.json
    const stockOptions = [
        "InStock",
        "MediumStock",
        "LowStock",
        "Backorder",
        "IsExpected",
        "AskForPrice",
        "OutOfStock",
        "Discontinued"
    ];

    // Σημαντικό: Πρόσθεσε όλα τα dependencies για να ενημερώνεται το context
    useEffect(() => {
        updateStockMapping(stockValues.id);
    }, [name_in_xml, translate_to, allow_import]);

    const updateStockMapping = (id) => {
        let new_map = importMapping.stock_map.map((item) => {
            if (item.id === id) {
                return {
                    ...item,
                    name_in_xml,
                    translate_to,
                    allow_import
                };
            }
            return item;
        });
        setImportMapping({ ...importMapping, stock_map: new_map });
    };

    const handleDeleteStock = () => {
        let new_map = importMapping.stock_map.filter(item => item.id !== stockValues.id)

        setImportMapping({ ...importMapping, stock_map: new_map })

    }

    return (
        <Tr>
            <Td>
                <Box padding={2}>
                    <TextInput
                        name={name_in_xml}
                        value={name_in_xml}
                        label="Όνομα στο αρχείο"
                        onChange={(e) => setName_in_xml(e.target.value)}
                    />
                </Box>
            </Td>
            <Td>
                <SingleSelect
                    placeholder="Select status"
                    value={translate_to}
                    onChange={(value) => setTranslate_to(value)}
                >
                    {stockOptions.map((option) => (
                        <SingleSelectOption key={option} value={option}>
                            {option}
                        </SingleSelectOption>
                    ))}
                </SingleSelect>
            </Td>
            <Td>
                <Checkbox
                    checked={allow_import}
                    onChange={() => setAllow_import(!allow_import)}
                ></Checkbox>
            </Td>
            <Td>
                <IconButton noBorder onClick={() => handleDeleteStock()} label="Delete" icon={<Trash />} />
            </Td>
        </Tr >
    )
}

const MappingStock = () => {
    const [importMapping, setImportMapping] = useContext(MappingContext)
    const [newID, setNewID] = useState(1)


    const handleAddStockValue = () => {
        let new_map = {
            id: `newID-${newID}`,
            name: ''
        }

        setNewID(newID + 1)
        let new_stock_map = [...importMapping.stock_map, new_map]
        setImportMapping({ ...importMapping, stock_map: new_stock_map })
    }

    return (
        <Box padding={4} background="neutral100">
            <Box padding={4}>
                <Flex direction="column" alignItems="flex-start" gap={2}>
                    <Flex alignItems="flex-center">
                        <Checkbox
                            checked={importMapping.has_quantity}
                            onChange={() => setImportMapping({ ...importMapping, has_quantity: !importMapping.has_quantity })}
                        ></Checkbox>
                        <Box paddingLeft={1}>
                            <Typography variant="omega" id="included-categories">Έχει ποσότητα;</Typography>
                        </Box>
                    </Flex>
                    <NumberInput
                        label="Ελάχιστη Ποσότητα"
                        name="min_quantity"
                        hint="Ορίστε μια τιμή μεταξύ 0 και 100"
                        error={importMapping.min_quantity > 100 ? 'Η τιμή είναι πολύ μεγάλη' : undefined}
                        onValueChange={(value) => setImportMapping({ ...importMapping, min_quantity: value })}
                        value={importMapping.min_quantity || 0}
                        min={0}   // Οριοθέτηση από το schema
                        max={100} // Οριοθέτηση από το schema
                        step={1}  // Αύξηση ανά 1 αφού είναι integer
                    />
                </Flex >
            </Box>
            <Table colCount={4} rowCount={20}
                footer={<TFooter icon={<Plus />} onClick={() => handleAddStockValue()}>Add another field to this collection type</TFooter>}>
                <Thead>
                    <Tr>
                        <Th>
                            <Typography variant="sigma">Όνομα στο αρχείο</Typography>
                        </Th>
                        <Th>
                            <Typography variant="sigma">Μετάφραση σε</Typography>
                        </Th>
                        <Th>
                            <Typography variant="sigma">Allow Import</Typography>
                        </Th>
                        <Th>
                            <Typography variant="sigma">Ενέργεια</Typography>
                        </Th>
                    </Tr>
                </Thead>
                <Tbody>
                    {importMapping.stock_map.length > 0 && importMapping.stock_map.map(item =>
                        <MappingValues key={item.id} stockValues={item} />
                    )}
                </Tbody>
            </Table>
        </Box >
    )

}

export default MappingStock