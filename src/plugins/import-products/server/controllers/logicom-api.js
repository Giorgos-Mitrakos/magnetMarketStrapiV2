'use strict';

const CryptoJS = require('crypto-js');
const fs       = require('fs');
const path     = require('path');

const CREDENTIALS_FILE = path.join(process.cwd(), 'logicom-credentials.json');

// ─────────────────────────────────────────────
// Helpers - ίδια λογική με τον adapter
// ─────────────────────────────────────────────
function getBaseUrl() {
    return process.env.LOGICOM_BASE_URL || 'https://quickconnect.logicompartners.com/api';
}

function aesEncrypt(plaintext, key) {
    const keyPadded = key.padEnd(32, '\0').substring(0, 32);
    const keyWA = CryptoJS.enc.Utf8.parse(keyPadded);
    const ivWA  = CryptoJS.enc.Hex.parse('00000000000000000000000000000000');

    const encrypted = CryptoJS.AES.encrypt(plaintext, keyWA, {
        iv:      ivWA,
        mode:    CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });

    return encrypted.toString();
}

function getTimestamp() {
    return Math.floor(Date.now() / 1000).toString();
}

function getEnvCredentials() {
    const customerId     = process.env.LOGICOM_CUSTOMER_ID;
    const consumerKey    = process.env.LOGICOM_CONSUMER_KEY;
    const consumerSecret = process.env.LOGICOM_CONSUMER_SECRET;
    const accessTokenKey = process.env.LOGICOM_ACCESS_TOKEN_KEY;

    if (!customerId || !consumerKey || !consumerSecret || !accessTokenKey) {
        throw new Error(
            'Missing .env variables: LOGICOM_CUSTOMER_ID, LOGICOM_CONSUMER_KEY, ' +
            'LOGICOM_CONSUMER_SECRET, LOGICOM_ACCESS_TOKEN_KEY'
        );
    }

    return { customerId, consumerKey, consumerSecret, accessTokenKey };
}

async function generateAccessToken() {
    const { customerId, consumerKey, consumerSecret, accessTokenKey } = getEnvCredentials();
    const timestamp = getTimestamp();

    const bCode = aesEncrypt(`${consumerKey};${consumerSecret}`, accessTokenKey);
    const generateSignature = aesEncrypt(
        `${consumerKey}${customerId}${timestamp};${consumerSecret}`,
        accessTokenKey
    );

    const response = await fetch(`${getBaseUrl()}/GenerateAccessToken`, {
        method: 'GET',
        headers: {
            'CustomerID':        customerId,
            'Timestamp':         timestamp,
            'BCode':             bCode,
            'GenerateSignature': generateSignature,
            'Accept':            'application/json'
        }
    });

    const text = await response.text();
    if (!response.ok) throw new Error(`GenerateAccessToken failed (${response.status}): ${text}`);

    return { token: text.trim(), timestamp };
}

function buildHeaders(accessToken, timestamp) {
    const { customerId, accessTokenKey } = getEnvCredentials();
    const encrypted = aesEncrypt(`${accessToken}${timestamp}`, accessTokenKey);
    const signature  = Buffer.from(encrypted).toString('base64');

    return {
        'Authorization': accessToken,
        'Timestamp':     timestamp,
        'Signature':     signature,
        'CustomerId':    customerId,
        'Accept':        'application/json'
    };
}

// ─────────────────────────────────────────────
// CONTROLLER
// ─────────────────────────────────────────────
module.exports = {

    /**
     * GET /logicom-api/credentials
     * Headers: x-logicom-username, x-logicom-password
     *
     * ⚠️  ΜΟΝΟ ΑΡΧΙΚΑ - 5 προσπάθειες / 24 ώρες
     * Αποθηκεύει σε logicom-credentials.json
     */
    async getCredentials(ctx) {
        try {
            const username = ctx.request.headers['x-logicom-username'];
            const password = ctx.request.headers['x-logicom-password'];

            if (!username || !password) {
                ctx.status = 400;
                ctx.body = { error: 'Headers x-logicom-username and x-logicom-password are required' };
                return;
            }

            console.log(`\n⚠️  Logicom GetCredentials → ${getBaseUrl()}`);

            const response = await fetch(`${getBaseUrl()}/GetCredentials`, {
                method: 'GET',
                headers: {
                    'Username': username,
                    'Password': password,
                    'Accept':   'application/json'
                }
            });

            const text = await response.text();

            let data;
            try { data = JSON.parse(text); } catch { data = text; }

            if (!response.ok) {
                ctx.status = response.status;
                ctx.body = { success: false, status: response.status, raw: text };
                return;
            }

            // ✅ Αποθήκευση σε JSON αρχείο
            const saved = {
                savedAt:        new Date().toISOString(),
                baseUrl:        getBaseUrl(),
                CustomerId:     data.CustomerId,
                ConsumerKey:    data.ConsumerKey,
                ConsumerSecret: data.ConsumerSecret,
                AccessTokenKey: data.AccessTokenKey,
                envTemplate:    [
                    `LOGICOM_BASE_URL=https://quickconnect.logicompartners.com/api`,
                    `LOGICOM_CUSTOMER_ID=${data.CustomerId     || ''}`,
                    `LOGICOM_CONSUMER_KEY=${data.ConsumerKey   || ''}`,
                    `LOGICOM_CONSUMER_SECRET=${data.ConsumerSecret || ''}`,
                    `LOGICOM_ACCESS_TOKEN_KEY=${data.AccessTokenKey || ''}`
                ].join('\n')
            };

            fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(saved, null, 2), 'utf8');
            console.log(`✅ Credentials saved: ${CREDENTIALS_FILE}`);

            ctx.body = {
                success:     true,
                message:     '✅ Credentials saved to logicom-credentials.json — copy envTemplate to .env',
                savedTo:     CREDENTIALS_FILE,
                credentials: saved
            };

        } catch (err) {
            ctx.status = 500;
            ctx.body = { success: false, error: err.message };
        }
    },

    /**
     * GET /logicom-api/health
     * Έλεγχος κατάστασης
     */
    async health(ctx) {
        ctx.body = {
            status:  'ok',
            baseUrl: getBaseUrl(),
            envSet: {
                LOGICOM_CUSTOMER_ID:      !!process.env.LOGICOM_CUSTOMER_ID,
                LOGICOM_CONSUMER_KEY:     !!process.env.LOGICOM_CONSUMER_KEY,
                LOGICOM_CONSUMER_SECRET:  !!process.env.LOGICOM_CONSUMER_SECRET,
                LOGICOM_ACCESS_TOKEN_KEY: !!process.env.LOGICOM_ACCESS_TOKEN_KEY,
            }
        };
    },

    /**
     * GET /logicom-api/token
     * Δοκιμή authentication
     */
    async generateToken(ctx) {
        try {
            const { token, timestamp } = await generateAccessToken();
            ctx.body = {
                success:   true,
                baseUrl:   getBaseUrl(),
                token:     `${token.substring(0, 40)}...`,
                timestamp,
                message:   '✅ Authentication successful'
            };
        } catch (err) {
            ctx.status = 500;
            ctx.body = { success: false, error: err.message };
        }
    },

    /**
     * GET /logicom-api/products
     * Query: ?PreviousItemNo=&Currency=EUR&Brand=&Category=&ProductId=
     */
    async getProducts(ctx) {
        try {
            const { token, timestamp } = await generateAccessToken();
            const headers = buildHeaders(token, timestamp);

            const url = new URL(`${getBaseUrl()}/GetProducts`);
            url.searchParams.set('Currency', ctx.query.Currency || 'EUR');
            ['PreviousItemNo', 'ProductId', 'Brand', 'Category', 'DateFrom', 'DateTo']
                .forEach(p => { if (ctx.query[p]) url.searchParams.set(p, ctx.query[p]); });

            const response = await fetch(url.toString(), { method: 'GET', headers });
            const data = await response.json();

            ctx.body = {
                success:      response.ok,
                status:       response.status,
                baseUrl:      getBaseUrl(),
                productCount: Array.isArray(data.Message) ? data.Message.length : 0,
                nextItemNo:   data.NextItemNo || null,
                data
            };
        } catch (err) {
            ctx.status = 500;
            ctx.body = { success: false, error: err.message };
        }
    },

    /**
     * GET /logicom-api/inventory?ProductId=SKU1;SKU2
     */
    async getInventory(ctx) {
        try {
            if (!ctx.query.ProductId) {
                ctx.status = 400;
                ctx.body = { error: 'ProductId required (e.g. ?ProductId=SKU1;SKU2)' };
                return;
            }

            const { token, timestamp } = await generateAccessToken();
            const headers = buildHeaders(token, timestamp);

            const url = new URL(`${getBaseUrl()}/GetInventory`);
            url.searchParams.set('ProductId', ctx.query.ProductId);

            const response = await fetch(url.toString(), { method: 'GET', headers });
            const data = await response.json();

            ctx.body = { success: response.ok, status: response.status, baseUrl: getBaseUrl(), data };
        } catch (err) {
            ctx.status = 500;
            ctx.body = { success: false, error: err.message };
        }
    },

    /**
     * GET /logicom-api/price?ProductId=SKU1;SKU2&Currency=EUR
     */
    async getPrice(ctx) {
        try {
            if (!ctx.query.ProductId) {
                ctx.status = 400;
                ctx.body = { error: 'ProductId required (e.g. ?ProductId=SKU1;SKU2)' };
                return;
            }

            const { token, timestamp } = await generateAccessToken();
            const headers = buildHeaders(token, timestamp);

            const url = new URL(`${getBaseUrl()}/GetPrice`);
            url.searchParams.set('ProductId', ctx.query.ProductId);
            url.searchParams.set('Currency', ctx.query.Currency || 'EUR');

            const response = await fetch(url.toString(), { method: 'GET', headers });
            const data = await response.json();

            ctx.body = { success: response.ok, status: response.status, baseUrl: getBaseUrl(), data };
        } catch (err) {
            ctx.status = 500;
            ctx.body = { success: false, error: err.message };
        }
    }
};