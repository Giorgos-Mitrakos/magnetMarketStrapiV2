/*
 *
 * HomePage
 *
 */

import { Box } from '@strapi/design-system/Box';
import { BaseHeaderLayout } from '@strapi/design-system/Layout';

const HomePage = () => {
  return (
    <>
      <Box background="neutral100">
        <BaseHeaderLayout
          title="Κουπόνια και Newsletter"
          subtitle="Διαχείριση Κουπονιών και Newsletter και παρακολούθηση στατιστικών"
          as="h2"
        />
      </Box>
    </>
  );
};

export default HomePage;
