import React, {  useContext } from 'react';
import { Box } from '@strapi/design-system/Box';
import { Grid, GridItem } from '@strapi/design-system/Grid';
import { NumberInput } from '@strapi/design-system/NumberInput';
import { Tooltip } from '@strapi/design-system/Tooltip';
import Information from '@strapi/icons/Information';
import { MappingContext } from '../../pages/Mapping/mappingcontext';

const MappingPrices = () => {
    const [importMapping, setImportMapping] = useContext(MappingContext)
    
    const handleMinimumPriceChange = (minimumPrice) => {
        setImportMapping({ ...importMapping, minimumPrice: minimumPrice })
    }

    const handleMaximumPriceChange = (maximumPrice) => {
        setImportMapping({ ...importMapping, maximumPrice: maximumPrice })
    }
 
    return (
        <Box padding={4} background="neutral100">
            <Grid gap={5}>
                <GridItem col={3} background="primary100">
                    <NumberInput
                        placeholder="This is a content placeholder"
                        label="Minimum Price"
                        name="minPrice"
                        onValueChange={value => handleMinimumPriceChange(value)}
                        value={importMapping.minimumPrice}
                        labelAction={<Tooltip description="Ελάχιστη τιμή χονδρικής για να εισαχθούν τα προϊόντα στη βάση.">
                            <button aria-label="Information about the minimun price" style={{
                                border: 'none',
                                padding: 0,
                                background: 'transparent'
                            }}>
                                <Information aria-hidden={true} />
                            </button>
                        </Tooltip>} />
                </GridItem>
                <GridItem col={3} background="primary100">
                    <NumberInput
                        placeholder="This is a content placeholder"
                        label="Maximum Price"
                        name="maxPrice"
                        onValueChange={value => handleMaximumPriceChange(value)}
                        value={importMapping.maximumPrice}
                        labelAction={<Tooltip description="Μέγιστη τιμή χονδρικής για να εισαχθούν τα προϊόντα στη βάση.">
                            <button aria-label="Information about the maximum price" style={{
                                border: 'none',
                                padding: 0,
                                background: 'transparent'
                            }}>
                                <Information aria-hidden={true} />
                            </button>
                        </Tooltip>} />
                </GridItem>
            </Grid>
        </Box>
    )
}

export default MappingPrices