/*
 *
 * HomePage
 *
 */
import { Box } from '@strapi/design-system/Box';
import { BaseHeaderLayout } from '@strapi/design-system/Layout';

import React from 'react';
// import PropTypes from 'prop-types';
import pluginId from '../../pluginId';

const HomePage = () => {
  return (
    <Box background="neutral100">
      <BaseHeaderLayout
        title="Piraeusbank Gateway"
        subtitle="Το σύστημα πληρωμών της Πειραιώς σας επιτρέπει να λαμβάνετε πληρωμές μέσω καρτών Maestro, Mastercard, American Express, Diners και Visa."
        as="h2"
      />
    </Box>
  );
};

export default HomePage;
