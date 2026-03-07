import React, { useState } from 'react';
import { HeaderLayout, ContentLayout } from '@strapi/design-system/Layout';
import { Box } from '@strapi/design-system/Box';
import { TabGroup, Tabs, Tab, TabPanels, TabPanel } from '@strapi/design-system/Tabs';
import CategoryList from '../../components/CategoryList';
import ProductList from '../../components/ProductList';

const HomePage = () => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <>
      <HeaderLayout
        title="Pricing Manager"
        subtitle="Διαχείριση τιμολόγησης ανά κατηγορία ή προϊόν"
      />
      <ContentLayout>
        <Box padding={8} background="neutral0">
          <TabGroup
            label="Επιλογή τύπου"
            id="tabs"
            onTabChange={setActiveTab}
            variant="simple"
          >
            <Tabs>
              <Tab>Κατηγορίες</Tab>
              <Tab>Προϊόντα</Tab>
            </Tabs>
            <TabPanels>
              <TabPanel>
                <Box padding={4}>
                  <CategoryList />
                </Box>
              </TabPanel>
              <TabPanel>
                <Box padding={4}>
                  <ProductList />
                </Box>
              </TabPanel>
            </TabPanels>
          </TabGroup>
        </Box>
      </ContentLayout>
    </>
  );
};

export default HomePage;