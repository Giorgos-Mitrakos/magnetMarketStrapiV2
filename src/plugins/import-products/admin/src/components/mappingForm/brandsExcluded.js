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

const MappingBrand = ({ brandToExclude }) => {
    const [importMapping, setImportMapping] = useContext(MappingContext)
    const [brandName, setBrandName] = useState(brandToExclude.brand_name)

    useEffect(() => {
        updateBrandMapping(brandToExclude.id)

    }, [brandName])

    const updateBrandMapping = (id) => {
        let new_map = importMapping.brand_excl_map.map((item) => {
            if (item.id === id) {
                item.brand_name = brandName
            }
            return item
        })
        setImportMapping({ ...importMapping, brand_excl_map: new_map })
    }

    const handleDeleteBrand = () => {
        let new_map = importMapping.brand_excl_map.filter(item => item.id !== brandToExclude.id)

        setImportMapping({ ...importMapping, brand_excl_map: new_map })

    }

    return (
        <>
            <Td>
                <Box padding={2}>
                    <TextInput
                        name={brandName}
                        value={brandName}
                        label="Όνομα στο αρχείο"
                        onChange={(e) => setBrandName(e.target.value)}
                    />
                </Box>
            </Td>
            <Td>
                <IconButton noBorder onClick={() => handleDeleteBrand()} label="Delete" icon={<Trash />} />
            </Td>
        </>
    )
}

const MappingBrands = () => {
    const [importMapping, setImportMapping] = useContext(MappingContext)

    const [newID, setNewID] = useState(1)


    const handleAddBrand = () => {
        let new_map = {
            id: `newID-${newID}`,
            brand_name: ''
        }

        setNewID(newID + 1)
        let new_brand_map = [...importMapping.brand_excl_map, new_map]
        setImportMapping({ ...importMapping, brand_excl_map: new_brand_map })
    }

    return (
        <Box padding={4} background="neutral100">
            <Table colCount={4} rowCount={20}
                footer={<TFooter icon={<Plus />} onClick={() => handleAddBrand()}>Add another field to this collection type</TFooter>}>
                <Thead>
                    <Tr>
                        <Th>
                            <Typography variant="sigma">Brand to Exclude</Typography>
                        </Th>
                        <Th>
                            <Typography variant="sigma">Ενέργεια</Typography>
                        </Th>
                    </Tr>
                </Thead>
                <Tbody>
                    {importMapping.brand_excl_map?.length > 0 && importMapping.brand_excl_map.map(item =>
                        <Tr key={item.idey}>
                            <MappingBrand brandToExclude={item} />
                        </Tr>
                    )}
                </Tbody>
            </Table>
        </Box >
    )

}

export default MappingBrands