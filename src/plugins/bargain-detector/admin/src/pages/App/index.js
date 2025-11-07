/**
 *
 * This component is the skeleton around the actual pages, and should only
 * contain code that should be seen on all pages. (e.g. navigation bar)
 *
 */

import React from 'react';
import { Switch, Route } from 'react-router-dom';
import { AnErrorOccurred } from '@strapi/helper-plugin';
import pluginId from '../../pluginId';
import HomePage from '../HomePage';
import OpportunitiesPage from '../OpportunitiesPage';
import OpportunityPage from '../OpportunityPage';
import SettingsPage from '../SettingsPage';

const App = () => {
  return (
    <div>
      <Switch>
        <Route path={`/plugins/${pluginId}`} component={HomePage} exact />
        <Route path={`/plugins/${pluginId}/opportunities`} component={OpportunitiesPage} exact />
        <Route path={`/plugins/${pluginId}/opportunities/:id`} component={OpportunityPage} exact />
        <Route path={`/plugins/${pluginId}/settings`} component={SettingsPage} exact />
        <Route component={AnErrorOccurred} />
      </Switch>
    </div>
  );
};

export default App;
