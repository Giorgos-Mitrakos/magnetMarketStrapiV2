import React, { useRef, useState, useEffect } from "react";
import { Box } from '@strapi/design-system/Box';
import { Tabs, Tab, TabGroup, TabPanels, TabPanel } from '@strapi/design-system/Tabs';
import { Typography } from '@strapi/design-system';
import { Grid, GridItem } from '@strapi/design-system/Grid';
import { Flex } from '@strapi/design-system/Flex';
import { Button } from '@strapi/design-system/Button';
import { Checkbox } from '@strapi/design-system/Checkbox';
import { Loader } from '@strapi/design-system/Loader';
// import { getPlatformCategories, getPlatforms, scrapPlatformCategories } from "../../utils/api";
import { useFetchClient } from "@strapi/helper-plugin";
import pluginId from "../../pluginId";

const PlatformsScreen = () => {

    const [isLoading, setIsLoading] = useState(true);
    const [isGettingCategories, setIsGettingCategories] = useState(false);
    const [platforms, setPlatforms] = useState({});
    const { get, post } = useFetchClient();

    const fetchPlatforms = async () => {
        const data = await get(`/${pluginId}`);
        setPlatforms(data.data); // Here

        setIsLoading(false);
        setIsGettingCategories(false);
    };

    useEffect(() => {
        fetchPlatforms();
    }, []);

    const handleGetCategoriesClick = async (platform) => {
        setIsGettingCategories(true);
        await post(`/${pluginId}/getPlatformCategories`,
            {
                platform
            });
        // await getPlatformCategories(platform)
        await fetchPlatforms()
    }

    const handleScrapCategories = async (platform) => {
        const data = await post(`/${pluginId}/scrapPlatformCategories`,
            {
                platform
            });
        // await scrapPlatformCategories(platform)
    }

    const handleCheckBoxClick = (platform, categoryID) => {

        const newPlatforms = platforms.map(x => {
            if (x.name === platform.name) {
                x.platformCategories.map(cat => {
                    if (cat.id === categoryID) {
                        if (cat.isChecked === null) {
                            cat.isChecked = true
                        }
                        else {
                            cat.isChecked = !cat.isChecked
                        }
                    }
                    return cat
                })
            }
            return x
        })
        setPlatforms(newPlatforms)
    }

    return (
        <Box padding={8} background="neutral100">
            <TabGroup label="Some stuff for the label" id="tabs">
                <Tabs>
                    {!isLoading && platforms.map(platform =>
                        <Tab key={platform.id}>{platform.name}</Tab>
                    )}
                </Tabs>
                <TabPanels>
                    {
                        !isLoading && platforms.map(platform =>
                            <TabPanel key={platform.id}>
                                <Grid>
                                    <GridItem col={12}>
                                        <Flex paddingTop={4} justifyContent="space-between">
                                            <Button variant='secondary' label="ScrapCategories"
                                                onClick={() => handleGetCategoriesClick(platform)}>
                                                <Flex>
                                                    Βρες τις κατηγορίες {isGettingCategories && <Loader small>Loading content...</Loader>}
                                                </Flex>
                                            </Button>
                                            <Button variant='secondary' label="Details">Αναλυτικά</Button>
                                            <Button size="L" label="Scrap"
                                                onClick={() => handleScrapCategories(platform)}>
                                                <Typography variant="beta">Scrap</Typography></Button>
                                        </Flex>
                                    </GridItem>
                                    <GridItem col={12} paddingTop={8}>
                                        <Grid direction="column" alignItems="flex-start">
                                            {platform.platformCategories.map(category =>
                                                <GridItem key={category.id} col={4}>
                                                    <Checkbox checked={category.isChecked ? category.isChecked : false} onClick={() => handleCheckBoxClick(platform, category.id)}>{category.name} ({category.numberOfProducts})</Checkbox>
                                                </GridItem>
                                            )}
                                        </Grid>
                                    </GridItem>
                                </Grid>

                            </TabPanel>
                        )
                    }
                </TabPanels>
            </TabGroup>
        </Box>
    )
}

export default PlatformsScreen;