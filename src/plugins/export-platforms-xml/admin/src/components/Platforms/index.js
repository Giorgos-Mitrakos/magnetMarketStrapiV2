import React, { useState, useEffect } from "react";
import { Box } from '@strapi/design-system/Box';
import { Tabs, Tab, TabGroup, TabPanels, TabPanel } from '@strapi/design-system/Tabs';
import { Loader } from '@strapi/design-system';
import TransferLists from "./TransferLists";
import { useFetchClient } from "@strapi/helper-plugin";
import pluginId from "../../pluginId";

const Platforms = () => {

    const [allCategories, setAllCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [allPlatforms, setAllPlatforms] = useState([]);
    const { get } = useFetchClient()

    const fetchCategories = async () => {
        const categories = await get(`/${pluginId}/`)
        setAllCategories(await categories.data); // Here

        const platforms = await get(`/${pluginId}/platforms`)
        setAllPlatforms(platforms.data); // Here
        setIsLoading(false);
    };

    useEffect(() => {
        fetchCategories()
    }, []);

    return (
        <Box padding={8} background="neutral100">
            {isLoading ? <Loader>Loading...</Loader>
                : <TabGroup label="Some stuff for the label" id="tabs">
                    <Tabs>
                        {!isLoading && allPlatforms.map(platform =>
                            <Tab key={platform.id}>{platform.name}</Tab>
                        )}
                    </Tabs>
                    <TabPanels>
                        {!isLoading && allPlatforms.map(platform =>
                            <TabPanel key={platform.id}>
                                <TransferLists
                                    categories={allCategories}
                                    platform={platform}
                                />
                            </TabPanel>
                        )}
                    </TabPanels>
                </TabGroup>}
        </Box>

    )
}

export default Platforms