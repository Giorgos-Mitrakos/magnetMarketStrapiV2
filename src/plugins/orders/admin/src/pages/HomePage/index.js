/*
 *
 * HomePage
 *
 */

import React from 'react';
// import PropTypes from 'prop-types';
import { Box } from '@strapi/design-system/Box';
import { BaseHeaderLayout } from '@strapi/design-system/Layout';
import OrderList from '../../components/orderList';

const HomePage = () => {
  return (
    <><Box background="neutral100">
      <BaseHeaderLayout
        title="Παραγγελίες"
        subtitle="Διαχείριση παραγγελιών."
        as="h2"
      />
    </Box>
      <OrderList />
    </>
  );
};

export default HomePage;
