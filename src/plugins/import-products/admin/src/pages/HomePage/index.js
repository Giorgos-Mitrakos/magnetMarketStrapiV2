/*
 *
 * HomePage
 *
 */

import React, { memo } from 'react';
// import PropTypes from 'prop-types';
import { Box } from '@strapi/design-system/Box';
import { BaseHeaderLayout } from '@strapi/design-system/Layout';
import UploadFileForm from '../../components/UploadFileForm';


const HomePage = () => {
  return (
    <>
      <Box background="neutral100">
        <BaseHeaderLayout
          title="Εισαγωγή Προϊόντων"
          subtitle="Εισαγωγή προϊόντων με XML και CSV"
          as="h2"
        />
      </Box>
      <UploadFileForm />
    </>
  );
};

export default memo(HomePage);
