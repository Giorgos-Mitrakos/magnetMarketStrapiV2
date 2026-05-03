'use strict';
const fs = require('fs');
const path = require('path');

module.exports = ({ strapi }) => ({
  logToFile(message, data = null) {
    try {
      const logDir = path.join(process.cwd(), 'logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir);
      }

      const fileName = `iason-import-${new Date().toISOString().split('T')[0]}.log`;
      const filePath = path.join(logDir, fileName);
      
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] ${message} ${data ? JSON.stringify(data, null, 2) : ''}\n`;

      fs.appendFileSync(filePath, logMessage, 'utf8');
    } catch (err) {
      console.error('Failed to write log to file:', err);
    }
  }
});