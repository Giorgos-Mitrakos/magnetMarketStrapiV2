import type { Attribute, Schema } from '@strapi/strapi';

export interface AdminApiToken extends Schema.CollectionType {
  collectionName: 'strapi_api_tokens';
  info: {
    description: '';
    displayName: 'Api Token';
    name: 'Api Token';
    pluralName: 'api-tokens';
    singularName: 'api-token';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    accessKey: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'admin::api-token',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    description: Attribute.String &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }> &
      Attribute.DefaultTo<''>;
    expiresAt: Attribute.DateTime;
    lastUsedAt: Attribute.DateTime;
    lifespan: Attribute.BigInteger;
    name: Attribute.String &
      Attribute.Required &
      Attribute.Unique &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Attribute.Relation<
      'admin::api-token',
      'oneToMany',
      'admin::api-token-permission'
    >;
    type: Attribute.Enumeration<['read-only', 'full-access', 'custom']> &
      Attribute.Required &
      Attribute.DefaultTo<'read-only'>;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'admin::api-token',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface AdminApiTokenPermission extends Schema.CollectionType {
  collectionName: 'strapi_api_token_permissions';
  info: {
    description: '';
    displayName: 'API Token Permission';
    name: 'API Token Permission';
    pluralName: 'api-token-permissions';
    singularName: 'api-token-permission';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'admin::api-token-permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    token: Attribute.Relation<
      'admin::api-token-permission',
      'manyToOne',
      'admin::api-token'
    >;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'admin::api-token-permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface AdminPermission extends Schema.CollectionType {
  collectionName: 'admin_permissions';
  info: {
    description: '';
    displayName: 'Permission';
    name: 'Permission';
    pluralName: 'permissions';
    singularName: 'permission';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    actionParameters: Attribute.JSON & Attribute.DefaultTo<{}>;
    conditions: Attribute.JSON & Attribute.DefaultTo<[]>;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'admin::permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    properties: Attribute.JSON & Attribute.DefaultTo<{}>;
    role: Attribute.Relation<'admin::permission', 'manyToOne', 'admin::role'>;
    subject: Attribute.String &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'admin::permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface AdminRole extends Schema.CollectionType {
  collectionName: 'admin_roles';
  info: {
    description: '';
    displayName: 'Role';
    name: 'Role';
    pluralName: 'roles';
    singularName: 'role';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    code: Attribute.String &
      Attribute.Required &
      Attribute.Unique &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<'admin::role', 'oneToOne', 'admin::user'> &
      Attribute.Private;
    description: Attribute.String;
    name: Attribute.String &
      Attribute.Required &
      Attribute.Unique &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Attribute.Relation<
      'admin::role',
      'oneToMany',
      'admin::permission'
    >;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<'admin::role', 'oneToOne', 'admin::user'> &
      Attribute.Private;
    users: Attribute.Relation<'admin::role', 'manyToMany', 'admin::user'>;
  };
}

export interface AdminTransferToken extends Schema.CollectionType {
  collectionName: 'strapi_transfer_tokens';
  info: {
    description: '';
    displayName: 'Transfer Token';
    name: 'Transfer Token';
    pluralName: 'transfer-tokens';
    singularName: 'transfer-token';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    accessKey: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'admin::transfer-token',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    description: Attribute.String &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }> &
      Attribute.DefaultTo<''>;
    expiresAt: Attribute.DateTime;
    lastUsedAt: Attribute.DateTime;
    lifespan: Attribute.BigInteger;
    name: Attribute.String &
      Attribute.Required &
      Attribute.Unique &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Attribute.Relation<
      'admin::transfer-token',
      'oneToMany',
      'admin::transfer-token-permission'
    >;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'admin::transfer-token',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface AdminTransferTokenPermission extends Schema.CollectionType {
  collectionName: 'strapi_transfer_token_permissions';
  info: {
    description: '';
    displayName: 'Transfer Token Permission';
    name: 'Transfer Token Permission';
    pluralName: 'transfer-token-permissions';
    singularName: 'transfer-token-permission';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'admin::transfer-token-permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    token: Attribute.Relation<
      'admin::transfer-token-permission',
      'manyToOne',
      'admin::transfer-token'
    >;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'admin::transfer-token-permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface AdminUser extends Schema.CollectionType {
  collectionName: 'admin_users';
  info: {
    description: '';
    displayName: 'User';
    name: 'User';
    pluralName: 'users';
    singularName: 'user';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    blocked: Attribute.Boolean & Attribute.Private & Attribute.DefaultTo<false>;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<'admin::user', 'oneToOne', 'admin::user'> &
      Attribute.Private;
    email: Attribute.Email &
      Attribute.Required &
      Attribute.Private &
      Attribute.Unique &
      Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    firstname: Attribute.String &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    isActive: Attribute.Boolean &
      Attribute.Private &
      Attribute.DefaultTo<false>;
    lastname: Attribute.String &
      Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    password: Attribute.Password &
      Attribute.Private &
      Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    preferedLanguage: Attribute.String;
    registrationToken: Attribute.String & Attribute.Private;
    resetPasswordToken: Attribute.String & Attribute.Private;
    roles: Attribute.Relation<'admin::user', 'manyToMany', 'admin::role'> &
      Attribute.Private;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<'admin::user', 'oneToOne', 'admin::user'> &
      Attribute.Private;
    username: Attribute.String;
  };
}

export interface ApiAnnouncementAnnouncement extends Schema.SingleType {
  collectionName: 'announcements';
  info: {
    description: '';
    displayName: '\u0391nnouncement';
    pluralName: 'announcements';
    singularName: 'announcement';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::announcement.announcement',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    publishedAt: Attribute.DateTime;
    text: Attribute.Text;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::announcement.announcement',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiBrandBrand extends Schema.CollectionType {
  collectionName: 'brands';
  info: {
    displayName: 'Brand';
    pluralName: 'brands';
    singularName: 'brand';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::brand.brand',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    logo: Attribute.Media<'images'>;
    name: Attribute.String & Attribute.Required;
    products: Attribute.Relation<
      'api::brand.brand',
      'oneToMany',
      'api::product.product'
    >;
    publishedAt: Attribute.DateTime;
    slug: Attribute.UID<'api::brand.brand', 'name'> & Attribute.Required;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::brand.brand',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiCategoryCategory extends Schema.CollectionType {
  collectionName: 'categories';
  info: {
    description: '';
    displayName: 'Category';
    pluralName: 'categories';
    singularName: 'category';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    average_weight: Attribute.Decimal &
      Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Attribute.DefaultTo<0>;
    cat_percentage: Attribute.Component<'categories.percentage', true>;
    categories: Attribute.Relation<
      'api::category.category',
      'manyToMany',
      'api::category.category'
    >;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::category.category',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    export_to_platforms: Attribute.Relation<
      'api::category.category',
      'manyToMany',
      'api::platform.platform'
    >;
    filters: Attribute.Component<'categories.filters', true>;
    image: Attribute.Media<'images'>;
    name: Attribute.String & Attribute.Required;
    parents: Attribute.Relation<
      'api::category.category',
      'manyToMany',
      'api::category.category'
    >;
    products: Attribute.Relation<
      'api::category.category',
      'oneToMany',
      'api::product.product'
    >;
    publishedAt: Attribute.DateTime;
    slug: Attribute.UID<'api::category.category', 'name'> & Attribute.Required;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::category.category',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiCountryCountry extends Schema.CollectionType {
  collectionName: 'countries';
  info: {
    displayName: 'Country';
    pluralName: 'countries';
    singularName: 'country';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::country.country',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    name: Attribute.String;
    publishedAt: Attribute.DateTime;
    states: Attribute.Relation<
      'api::country.country',
      'oneToMany',
      'api::state.state'
    >;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::country.country',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiFooterFooter extends Schema.SingleType {
  collectionName: 'footers';
  info: {
    description: '';
    displayName: 'Footer';
    pluralName: 'footers';
    singularName: 'footer';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    address: Attribute.String;
    city: Attribute.String;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::footer.footer',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    email: Attribute.Email;
    opening_hours: Attribute.String;
    postcode: Attribute.String;
    publishedAt: Attribute.DateTime;
    sections: Attribute.Component<'global.link-section', true>;
    telephone: Attribute.String;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::footer.footer',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiHomepageHomepage extends Schema.SingleType {
  collectionName: 'homepages';
  info: {
    description: '';
    displayName: 'Homepage';
    pluralName: 'homepages';
    singularName: 'homepage';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    body: Attribute.DynamicZone<
      [
        'homepage.category-banner',
        'homepage.banner-list-products',
        'homepage.triple-banner',
        'homepage.single-banner',
        'homepage.double-banner',
        'homepage.hot-or-sale'
      ]
    >;
    Carousel: Attribute.DynamicZone<['global.banner']>;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::homepage.homepage',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    fixed_hero_banners: Attribute.DynamicZone<['global.banner']>;
    publishedAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::homepage.homepage',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiNewsletterNewsletter extends Schema.CollectionType {
  collectionName: 'newsletters';
  info: {
    displayName: 'Newsletter';
    pluralName: 'newsletters';
    singularName: 'newsletter';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::newsletter.newsletter',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    email: Attribute.Email & Attribute.Required & Attribute.Unique;
    publishedAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::newsletter.newsletter',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiOrderOrder extends Schema.CollectionType {
  collectionName: 'orders';
  info: {
    description: '';
    displayName: 'Order';
    pluralName: 'orders';
    singularName: 'order';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    billing_address: Attribute.JSON & Attribute.Required;
    comments: Attribute.Component<'shipping.comment', true>;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::order.order',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    delivery_notes: Attribute.Text;
    different_shipping: Attribute.Boolean &
      Attribute.Required &
      Attribute.DefaultTo<false>;
    installments: Attribute.Integer &
      Attribute.Required &
      Attribute.SetMinMax<
        {
          max: 3;
          min: 1;
        },
        number
      > &
      Attribute.DefaultTo<1>;
    isInvoice: Attribute.Boolean &
      Attribute.Required &
      Attribute.DefaultTo<false>;
    payment: Attribute.Component<'shipping.method'> & Attribute.Required;
    products: Attribute.JSON & Attribute.Required;
    publishedAt: Attribute.DateTime;
    shipping: Attribute.Component<'shipping.method'> & Attribute.Required;
    shipping_address: Attribute.JSON & Attribute.Required;
    status: Attribute.Enumeration<
      [
        '\u0395\u03BA\u03BA\u03C1\u03B5\u03BC\u03B5\u03AF \u03C0\u03BB\u03B7\u03C1\u03C9\u03BC\u03AE',
        '\u03A3\u03B5 \u03B5\u03C0\u03B5\u03BE\u03B5\u03C1\u03B3\u03B1\u03C3\u03AF\u03B1',
        '\u03A3\u03B5 \u03B1\u03BD\u03B1\u03BC\u03BF\u03BD\u03AE',
        '\u039F\u03BB\u03BF\u03BA\u03BB\u03B7\u03C1\u03C9\u03BC\u03AD\u03BD\u03B7',
        '\u0391\u03BA\u03C5\u03C1\u03C9\u03BC\u03AD\u03BD\u03B7',
        '\u0395\u03C0\u03B9\u03C3\u03C4\u03C1\u03BF\u03C6\u03AE \u03C7\u03C1\u03B7\u03BC\u03AC\u03C4\u03C9\u03BD',
        '\u0391\u03C0\u03BF\u03C4\u03C5\u03C7\u03B7\u03BC\u03AD\u03BD\u03B7',
        '\u03A0\u03C1\u03CC\u03C7\u03B5\u03B9\u03C1\u03BF'
      ]
    > &
      Attribute.Required &
      Attribute.DefaultTo<'\u03A3\u03B5 \u03B1\u03BD\u03B1\u03BC\u03BF\u03BD\u03AE'>;
    total: Attribute.Decimal &
      Attribute.Required &
      Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    TranTicket: Attribute.Component<'payment.tran-ticket'> & Attribute.Private;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::order.order',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    user: Attribute.Relation<
      'api::order.order',
      'manyToOne',
      'plugin::users-permissions.user'
    >;
  };
}

export interface ApiPagePage extends Schema.CollectionType {
  collectionName: 'pages';
  info: {
    description: '';
    displayName: 'page';
    pluralName: 'pages';
    singularName: 'page';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<'api::page.page', 'oneToOne', 'admin::user'> &
      Attribute.Private;
    mainText: Attribute.RichText;
    publishedAt: Attribute.DateTime;
    title: Attribute.String;
    titleSlug: Attribute.UID<'api::page.page', 'title'>;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<'api::page.page', 'oneToOne', 'admin::user'> &
      Attribute.Private;
  };
}

export interface ApiPaymentPayment extends Schema.CollectionType {
  collectionName: 'payments';
  info: {
    description: '';
    displayName: 'Payment';
    pluralName: 'payments';
    singularName: 'payment';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::payment.payment',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    icon: Attribute.Media<'images'>;
    isActive: Attribute.Boolean &
      Attribute.Required &
      Attribute.DefaultTo<true>;
    name: Attribute.String;
    price: Attribute.Decimal &
      Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Attribute.DefaultTo<0>;
    publishedAt: Attribute.DateTime;
    range: Attribute.Component<'payment.range'>;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::payment.payment',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiPlatformPlatform extends Schema.CollectionType {
  collectionName: 'platforms';
  info: {
    description: '';
    displayName: 'Platform';
    pluralName: 'platforms';
    singularName: 'platform';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::platform.platform',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    entryURL: Attribute.String & Attribute.Required;
    export_categories: Attribute.Relation<
      'api::platform.platform',
      'manyToMany',
      'api::category.category'
    >;
    merchantFeeCatalogue: Attribute.Media<'files'>;
    name: Attribute.String & Attribute.Required;
    order_time: Attribute.Time & Attribute.DefaultTo<'11:50'>;
    platformCategories: Attribute.Relation<
      'api::platform.platform',
      'oneToMany',
      'plugin::platform-scrapper.platformcategory'
    >;
    product_scrap_days: Attribute.Integer &
      Attribute.Required &
      Attribute.DefaultTo<10>;
    publishedAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::platform.platform',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiPostalCodePostalCode extends Schema.CollectionType {
  collectionName: 'postal_codes';
  info: {
    displayName: 'PostalCode';
    pluralName: 'postal-codes';
    singularName: 'postal-code';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::postal-code.postal-code',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    postal: Attribute.String;
    publishedAt: Attribute.DateTime;
    regions: Attribute.Relation<
      'api::postal-code.postal-code',
      'manyToMany',
      'api::region.region'
    >;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::postal-code.postal-code',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiProductProduct extends Schema.CollectionType {
  collectionName: 'products';
  info: {
    description: '';
    displayName: 'Product';
    pluralName: 'products';
    singularName: 'product';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    additionalFiles: Attribute.Media<'files'>;
    additionalImages: Attribute.Media<
      'images' | 'files' | 'videos' | 'audios',
      true
    >;
    barcode: Attribute.String;
    brand: Attribute.Relation<
      'api::product.product',
      'manyToOne',
      'api::brand.brand'
    >;
    category: Attribute.Relation<
      'api::product.product',
      'manyToOne',
      'api::category.category'
    >;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::product.product',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    deletedAt: Attribute.DateTime;
    description: Attribute.Text;
    height: Attribute.Decimal & Attribute.DefaultTo<0>;
    image: Attribute.Media<'images'>;
    ImageURLS: Attribute.Component<'products.images-supplier-urls', true>;
    inventory: Attribute.Integer & Attribute.DefaultTo<0>;
    is_fixed_price: Attribute.Boolean & Attribute.DefaultTo<false>;
    is_hot: Attribute.Boolean & Attribute.DefaultTo<false>;
    is_in_house: Attribute.Boolean &
      Attribute.Private &
      Attribute.DefaultTo<false>;
    is_sale: Attribute.Boolean & Attribute.DefaultTo<false>;
    length: Attribute.Decimal & Attribute.DefaultTo<0>;
    model: Attribute.String;
    mpn: Attribute.String & Attribute.Unique;
    name: Attribute.String & Attribute.Required;
    need_verify: Attribute.Boolean &
      Attribute.Private &
      Attribute.DefaultTo<false>;
    platforms: Attribute.Component<'products.platform', true>;
    price: Attribute.Decimal &
      Attribute.Required &
      Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    prod_chars: Attribute.Component<'products.chars', true>;
    publishedAt: Attribute.DateTime;
    related_import: Attribute.Relation<
      'api::product.product',
      'manyToMany',
      'plugin::import-products.importxml'
    >;
    related_to: Attribute.Relation<
      'api::product.product',
      'manyToMany',
      'api::product.product'
    >;
    related_with: Attribute.Relation<
      'api::product.product',
      'manyToMany',
      'api::product.product'
    >;
    sale_price: Attribute.Decimal &
      Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    seo: Attribute.Component<'shared.seo', true>;
    short_description: Attribute.Text;
    sku: Attribute.String & Attribute.Unique;
    slug: Attribute.UID<'api::product.product', 'name'> & Attribute.Required;
    status: Attribute.Enumeration<
      ['InStock', 'MediumStock', 'LowStock', 'Backorder', 'OutOfStock']
    > &
      Attribute.Required &
      Attribute.DefaultTo<'InStock'>;
    supplierInfo: Attribute.Component<'products.info', true>;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::product.product',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    weight: Attribute.Integer & Attribute.DefaultTo<0>;
    width: Attribute.Decimal & Attribute.DefaultTo<0>;
  };
}

export interface ApiRegionRegion extends Schema.CollectionType {
  collectionName: 'regions';
  info: {
    description: '';
    displayName: 'Region';
    pluralName: 'regions';
    singularName: 'region';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::region.region',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    name: Attribute.String;
    postal_codes: Attribute.Relation<
      'api::region.region',
      'manyToMany',
      'api::postal-code.postal-code'
    >;
    publishedAt: Attribute.DateTime;
    shippings: Attribute.Relation<
      'api::region.region',
      'manyToMany',
      'api::shipping.shipping'
    >;
    state: Attribute.Relation<
      'api::region.region',
      'manyToOne',
      'api::state.state'
    >;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::region.region',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiShippingShipping extends Schema.CollectionType {
  collectionName: 'shippings';
  info: {
    description: '';
    displayName: 'Shipping';
    pluralName: 'shippings';
    singularName: 'shipping';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::shipping.shipping',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    disprosites_fees: Attribute.Component<'shipping.fees'>;
    disprosites_perioxes: Attribute.Relation<
      'api::shipping.shipping',
      'manyToMany',
      'api::region.region'
    >;
    isActive: Attribute.Boolean &
      Attribute.Required &
      Attribute.DefaultTo<true>;
    name: Attribute.String & Attribute.Required & Attribute.Unique;
    publishedAt: Attribute.DateTime;
    Regions_file: Attribute.Media<'files'>;
    update_regions: Attribute.Boolean & Attribute.DefaultTo<false>;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::shipping.shipping',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    Zones: Attribute.Component<'shipping.zone', true>;
  };
}

export interface ApiStateState extends Schema.CollectionType {
  collectionName: 'states';
  info: {
    description: '';
    displayName: 'State';
    pluralName: 'states';
    singularName: 'state';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::state.state',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    name: Attribute.String & Attribute.Required & Attribute.Unique;
    publishedAt: Attribute.DateTime;
    regions: Attribute.Relation<
      'api::state.state',
      'oneToMany',
      'api::region.region'
    >;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::state.state',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface ApiUserAddressUserAddress extends Schema.CollectionType {
  collectionName: 'user_addresses';
  info: {
    description: '';
    displayName: 'user-address';
    pluralName: 'user-addresses';
    singularName: 'user-address';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    afm: Attribute.String;
    businessActivity: Attribute.String;
    city: Attribute.String;
    companyName: Attribute.String;
    country: Attribute.String;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::user-address.user-address',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    doy: Attribute.String;
    email_address: Attribute.Email;
    firstname: Attribute.String;
    isInvoice: Attribute.Boolean &
      Attribute.Required &
      Attribute.DefaultTo<false>;
    lastname: Attribute.String;
    mobilePhone: Attribute.String;
    state: Attribute.String;
    street: Attribute.String;
    telephone: Attribute.String;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::user-address.user-address',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    user_billing: Attribute.Relation<
      'api::user-address.user-address',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    user_shipping: Attribute.Relation<
      'api::user-address.user-address',
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    zipCode: Attribute.String;
  };
}

export interface PluginContentReleasesRelease extends Schema.CollectionType {
  collectionName: 'strapi_releases';
  info: {
    displayName: 'Release';
    pluralName: 'releases';
    singularName: 'release';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    actions: Attribute.Relation<
      'plugin::content-releases.release',
      'oneToMany',
      'plugin::content-releases.release-action'
    >;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::content-releases.release',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    name: Attribute.String & Attribute.Required;
    releasedAt: Attribute.DateTime;
    scheduledAt: Attribute.DateTime;
    status: Attribute.Enumeration<
      ['ready', 'blocked', 'failed', 'done', 'empty']
    > &
      Attribute.Required;
    timezone: Attribute.String;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'plugin::content-releases.release',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginContentReleasesReleaseAction
  extends Schema.CollectionType {
  collectionName: 'strapi_release_actions';
  info: {
    displayName: 'Release Action';
    pluralName: 'release-actions';
    singularName: 'release-action';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    contentType: Attribute.String & Attribute.Required;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::content-releases.release-action',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    entry: Attribute.Relation<
      'plugin::content-releases.release-action',
      'morphToOne'
    >;
    isEntryValid: Attribute.Boolean;
    locale: Attribute.String;
    release: Attribute.Relation<
      'plugin::content-releases.release-action',
      'manyToOne',
      'plugin::content-releases.release'
    >;
    type: Attribute.Enumeration<['publish', 'unpublish']> & Attribute.Required;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'plugin::content-releases.release-action',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginEmailDesignerEmailTemplate
  extends Schema.CollectionType {
  collectionName: 'email_templates';
  info: {
    displayName: 'Email-template';
    name: 'email-template';
    pluralName: 'email-templates';
    singularName: 'email-template';
  };
  options: {
    comment: '';
    draftAndPublish: false;
    increments: true;
    timestamps: true;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    bodyHtml: Attribute.Text;
    bodyText: Attribute.Text;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::email-designer.email-template',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    design: Attribute.JSON;
    enabled: Attribute.Boolean & Attribute.DefaultTo<true>;
    name: Attribute.String;
    subject: Attribute.String;
    tags: Attribute.JSON;
    templateReferenceId: Attribute.Integer & Attribute.Unique;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'plugin::email-designer.email-template',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginI18NLocale extends Schema.CollectionType {
  collectionName: 'i18n_locale';
  info: {
    collectionName: 'locales';
    description: '';
    displayName: 'Locale';
    pluralName: 'locales';
    singularName: 'locale';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    code: Attribute.String & Attribute.Unique;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::i18n.locale',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    name: Attribute.String &
      Attribute.SetMinMax<
        {
          max: 50;
          min: 1;
        },
        number
      >;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'plugin::i18n.locale',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginImportProductsBlacklistmap
  extends Schema.CollectionType {
  collectionName: 'blacklistmaps';
  info: {
    displayName: 'blacklistmap';
    pluralName: 'blacklistmaps';
    singularName: 'blacklistmap';
  };
  options: {
    comment: '';
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::import-products.blacklistmap',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    name: Attribute.String & Attribute.Required;
    parentcategory: Attribute.Relation<
      'plugin::import-products.blacklistmap',
      'manyToOne',
      'plugin::import-products.blacklistmap'
    >;
    related_import: Attribute.Relation<
      'plugin::import-products.blacklistmap',
      'manyToOne',
      'plugin::import-products.importxml'
    >;
    subcategory: Attribute.Relation<
      'plugin::import-products.blacklistmap',
      'oneToMany',
      'plugin::import-products.blacklistmap'
    >;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'plugin::import-products.blacklistmap',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginImportProductsCategorymap extends Schema.CollectionType {
  collectionName: 'categorymaps';
  info: {
    displayName: 'categorymap';
    pluralName: 'categorymaps';
    singularName: 'categorymap';
  };
  options: {
    comment: '';
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    contains: Attribute.Component<'imports.contains-name', true>;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::import-products.categorymap',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    name: Attribute.String & Attribute.Required;
    parentcategory: Attribute.Relation<
      'plugin::import-products.categorymap',
      'manyToOne',
      'plugin::import-products.categorymap'
    >;
    related_import: Attribute.Relation<
      'plugin::import-products.categorymap',
      'manyToOne',
      'plugin::import-products.importxml'
    >;
    subcategory: Attribute.Relation<
      'plugin::import-products.categorymap',
      'oneToMany',
      'plugin::import-products.categorymap'
    >;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'plugin::import-products.categorymap',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    value: Attribute.String & Attribute.Required;
  };
}

export interface PluginImportProductsCharnamemap extends Schema.CollectionType {
  collectionName: 'charnamemaps';
  info: {
    displayName: 'charnamemap';
    pluralName: 'charnamemaps';
    singularName: 'charnamemap';
  };
  options: {
    comment: '';
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::import-products.charnamemap',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    name: Attribute.String & Attribute.Required;
    related_import: Attribute.Relation<
      'plugin::import-products.charnamemap',
      'manyToOne',
      'plugin::import-products.importxml'
    >;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'plugin::import-products.charnamemap',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    value: Attribute.String & Attribute.Required;
  };
}

export interface PluginImportProductsCharvaluemap
  extends Schema.CollectionType {
  collectionName: 'charvaluemaps';
  info: {
    displayName: 'charvaluemap';
    pluralName: 'charvaluemaps';
    singularName: 'charvaluemap';
  };
  options: {
    comment: '';
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::import-products.charvaluemap',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    name: Attribute.String & Attribute.Required;
    related_import: Attribute.Relation<
      'plugin::import-products.charvaluemap',
      'manyToOne',
      'plugin::import-products.importxml'
    >;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'plugin::import-products.charvaluemap',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    value: Attribute.String & Attribute.Required;
  };
}

export interface PluginImportProductsImportxml extends Schema.CollectionType {
  collectionName: 'importxmls';
  info: {
    displayName: 'Supplier';
    pluralName: 'importxmls';
    singularName: 'importxml';
  };
  options: {
    comment: '';
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: true;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    availability: Attribute.Integer &
      Attribute.Required &
      Attribute.DefaultTo<1>;
    blacklist_map: Attribute.Relation<
      'plugin::import-products.importxml',
      'oneToMany',
      'plugin::import-products.blacklistmap'
    >;
    categories_map: Attribute.Relation<
      'plugin::import-products.importxml',
      'oneToMany',
      'plugin::import-products.categorymap'
    >;
    char_name_map: Attribute.Relation<
      'plugin::import-products.importxml',
      'oneToMany',
      'plugin::import-products.charnamemap'
    >;
    char_value_map: Attribute.Relation<
      'plugin::import-products.importxml',
      'oneToMany',
      'plugin::import-products.charvaluemap'
    >;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::import-products.importxml',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    importedFile: Attribute.Media<'files'>;
    importedURL: Attribute.Text;
    isActive: Attribute.Boolean & Attribute.DefaultTo<true>;
    isWhitelistSelected: Attribute.Boolean & Attribute.DefaultTo<true>;
    lastRun: Attribute.DateTime;
    maximumPrice: Attribute.Decimal &
      Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Attribute.DefaultTo<0>;
    minimumPrice: Attribute.Decimal &
      Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Attribute.DefaultTo<0>;
    name: Attribute.String & Attribute.Required;
    order_time: Attribute.Time & Attribute.DefaultTo<'11:50'>;
    related_products: Attribute.Relation<
      'plugin::import-products.importxml',
      'manyToMany',
      'api::product.product'
    >;
    report: Attribute.String;
    shipping: Attribute.Decimal &
      Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Attribute.DefaultTo<0>;
    stock_map: Attribute.Relation<
      'plugin::import-products.importxml',
      'oneToMany',
      'plugin::import-products.stockmap'
    >;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'plugin::import-products.importxml',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    whitelist_map: Attribute.Relation<
      'plugin::import-products.importxml',
      'oneToMany',
      'plugin::import-products.whitelistmap'
    >;
  };
}

export interface PluginImportProductsStockmap extends Schema.CollectionType {
  collectionName: 'stockmaps';
  info: {
    displayName: 'stockmap';
    pluralName: 'stockmaps';
    singularName: 'stockmap';
  };
  options: {
    comment: '';
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::import-products.stockmap',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    name: Attribute.String & Attribute.Required;
    related_import: Attribute.Relation<
      'plugin::import-products.stockmap',
      'manyToOne',
      'plugin::import-products.importxml'
    >;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'plugin::import-products.stockmap',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginImportProductsWhitelistmap
  extends Schema.CollectionType {
  collectionName: 'whitelistmaps';
  info: {
    displayName: 'whitelistmap';
    pluralName: 'whitelistmaps';
    singularName: 'whitelistmap';
  };
  options: {
    comment: '';
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::import-products.whitelistmap',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    name: Attribute.String;
    parentcategory: Attribute.Relation<
      'plugin::import-products.whitelistmap',
      'manyToOne',
      'plugin::import-products.whitelistmap'
    >;
    related_import: Attribute.Relation<
      'plugin::import-products.whitelistmap',
      'manyToOne',
      'plugin::import-products.importxml'
    >;
    subcategory: Attribute.Relation<
      'plugin::import-products.whitelistmap',
      'oneToMany',
      'plugin::import-products.whitelistmap'
    >;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'plugin::import-products.whitelistmap',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginPlatformScrapperPlatformcategory
  extends Schema.CollectionType {
  collectionName: 'platformcategory';
  info: {
    displayName: 'platformcategory';
    pluralName: 'platformcategories';
    singularName: 'platformcategory';
  };
  options: {
    comment: '';
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    cpsFee: Attribute.Decimal;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::platform-scrapper.platformcategory',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    isChecked: Attribute.Boolean;
    link: Attribute.String;
    marketPlaceFee: Attribute.Decimal;
    numberOfProducts: Attribute.Integer;
    platform: Attribute.Relation<
      'plugin::platform-scrapper.platformcategory',
      'manyToOne',
      'api::platform.platform'
    >;
    title: Attribute.String;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'plugin::platform-scrapper.platformcategory',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginUploadFile extends Schema.CollectionType {
  collectionName: 'files';
  info: {
    description: '';
    displayName: 'File';
    pluralName: 'files';
    singularName: 'file';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    alternativeText: Attribute.String;
    caption: Attribute.String;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::upload.file',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    ext: Attribute.String;
    folder: Attribute.Relation<
      'plugin::upload.file',
      'manyToOne',
      'plugin::upload.folder'
    > &
      Attribute.Private;
    folderPath: Attribute.String &
      Attribute.Required &
      Attribute.Private &
      Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      >;
    formats: Attribute.JSON;
    hash: Attribute.String & Attribute.Required;
    height: Attribute.Integer;
    mime: Attribute.String & Attribute.Required;
    name: Attribute.String & Attribute.Required;
    previewUrl: Attribute.String;
    provider: Attribute.String & Attribute.Required;
    provider_metadata: Attribute.JSON;
    related: Attribute.Relation<'plugin::upload.file', 'morphToMany'>;
    size: Attribute.Decimal & Attribute.Required;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'plugin::upload.file',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    url: Attribute.String & Attribute.Required;
    width: Attribute.Integer;
  };
}

export interface PluginUploadFolder extends Schema.CollectionType {
  collectionName: 'upload_folders';
  info: {
    displayName: 'Folder';
    pluralName: 'folders';
    singularName: 'folder';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    children: Attribute.Relation<
      'plugin::upload.folder',
      'oneToMany',
      'plugin::upload.folder'
    >;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::upload.folder',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    files: Attribute.Relation<
      'plugin::upload.folder',
      'oneToMany',
      'plugin::upload.file'
    >;
    name: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      >;
    parent: Attribute.Relation<
      'plugin::upload.folder',
      'manyToOne',
      'plugin::upload.folder'
    >;
    path: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      >;
    pathId: Attribute.Integer & Attribute.Required & Attribute.Unique;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'plugin::upload.folder',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginUsersPermissionsPermission
  extends Schema.CollectionType {
  collectionName: 'up_permissions';
  info: {
    description: '';
    displayName: 'Permission';
    name: 'permission';
    pluralName: 'permissions';
    singularName: 'permission';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Attribute.String & Attribute.Required;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::users-permissions.permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    role: Attribute.Relation<
      'plugin::users-permissions.permission',
      'manyToOne',
      'plugin::users-permissions.role'
    >;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'plugin::users-permissions.permission',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginUsersPermissionsRole extends Schema.CollectionType {
  collectionName: 'up_roles';
  info: {
    description: '';
    displayName: 'Role';
    name: 'role';
    pluralName: 'roles';
    singularName: 'role';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::users-permissions.role',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    description: Attribute.String;
    name: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 3;
      }>;
    permissions: Attribute.Relation<
      'plugin::users-permissions.role',
      'oneToMany',
      'plugin::users-permissions.permission'
    >;
    type: Attribute.String & Attribute.Unique;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'plugin::users-permissions.role',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    users: Attribute.Relation<
      'plugin::users-permissions.role',
      'oneToMany',
      'plugin::users-permissions.user'
    >;
  };
}

export interface PluginUsersPermissionsUser extends Schema.CollectionType {
  collectionName: 'up_users';
  info: {
    description: '';
    displayName: 'User';
    name: 'user';
    pluralName: 'users';
    singularName: 'user';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    billing_address: Attribute.Relation<
      'plugin::users-permissions.user',
      'oneToOne',
      'api::user-address.user-address'
    >;
    blocked: Attribute.Boolean & Attribute.DefaultTo<false>;
    confirmationToken: Attribute.String & Attribute.Private;
    confirmed: Attribute.Boolean & Attribute.DefaultTo<false>;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::users-permissions.user',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    email: Attribute.Email &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    orders: Attribute.Relation<
      'plugin::users-permissions.user',
      'oneToMany',
      'api::order.order'
    >;
    password: Attribute.Password &
      Attribute.Private &
      Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    provider: Attribute.String;
    resetPasswordToken: Attribute.String & Attribute.Private;
    role: Attribute.Relation<
      'plugin::users-permissions.user',
      'manyToOne',
      'plugin::users-permissions.role'
    >;
    shipping_address: Attribute.Relation<
      'plugin::users-permissions.user',
      'oneToOne',
      'api::user-address.user-address'
    >;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'plugin::users-permissions.user',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    username: Attribute.String &
      Attribute.Required &
      Attribute.Unique &
      Attribute.SetMinMaxLength<{
        minLength: 3;
      }>;
  };
}

declare module '@strapi/types' {
  export module Shared {
    export interface ContentTypes {
      'admin::api-token': AdminApiToken;
      'admin::api-token-permission': AdminApiTokenPermission;
      'admin::permission': AdminPermission;
      'admin::role': AdminRole;
      'admin::transfer-token': AdminTransferToken;
      'admin::transfer-token-permission': AdminTransferTokenPermission;
      'admin::user': AdminUser;
      'api::announcement.announcement': ApiAnnouncementAnnouncement;
      'api::brand.brand': ApiBrandBrand;
      'api::category.category': ApiCategoryCategory;
      'api::country.country': ApiCountryCountry;
      'api::footer.footer': ApiFooterFooter;
      'api::homepage.homepage': ApiHomepageHomepage;
      'api::newsletter.newsletter': ApiNewsletterNewsletter;
      'api::order.order': ApiOrderOrder;
      'api::page.page': ApiPagePage;
      'api::payment.payment': ApiPaymentPayment;
      'api::platform.platform': ApiPlatformPlatform;
      'api::postal-code.postal-code': ApiPostalCodePostalCode;
      'api::product.product': ApiProductProduct;
      'api::region.region': ApiRegionRegion;
      'api::shipping.shipping': ApiShippingShipping;
      'api::state.state': ApiStateState;
      'api::user-address.user-address': ApiUserAddressUserAddress;
      'plugin::content-releases.release': PluginContentReleasesRelease;
      'plugin::content-releases.release-action': PluginContentReleasesReleaseAction;
      'plugin::email-designer.email-template': PluginEmailDesignerEmailTemplate;
      'plugin::i18n.locale': PluginI18NLocale;
      'plugin::import-products.blacklistmap': PluginImportProductsBlacklistmap;
      'plugin::import-products.categorymap': PluginImportProductsCategorymap;
      'plugin::import-products.charnamemap': PluginImportProductsCharnamemap;
      'plugin::import-products.charvaluemap': PluginImportProductsCharvaluemap;
      'plugin::import-products.importxml': PluginImportProductsImportxml;
      'plugin::import-products.stockmap': PluginImportProductsStockmap;
      'plugin::import-products.whitelistmap': PluginImportProductsWhitelistmap;
      'plugin::platform-scrapper.platformcategory': PluginPlatformScrapperPlatformcategory;
      'plugin::upload.file': PluginUploadFile;
      'plugin::upload.folder': PluginUploadFolder;
      'plugin::users-permissions.permission': PluginUsersPermissionsPermission;
      'plugin::users-permissions.role': PluginUsersPermissionsRole;
      'plugin::users-permissions.user': PluginUsersPermissionsUser;
    }
  }
}
