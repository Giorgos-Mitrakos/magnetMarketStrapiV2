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
    isClosable: Attribute.Boolean & Attribute.DefaultTo<true>;
    publishedAt: Attribute.DateTime;
    text: Attribute.Text;
    type: Attribute.Enumeration<['info', 'warning', 'important', 'event']>;
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
    useRetailPrice: Attribute.Relation<
      'api::brand.brand',
      'manyToMany',
      'plugin::import-products.importxml'
    >;
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
    coupons: Attribute.Relation<
      'api::category.category',
      'manyToMany',
      'api::coupon.coupon'
    >;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::category.category',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    cross_categories: Attribute.Relation<
      'api::category.category',
      'oneToMany',
      'api::category.category'
    >;
    description: Attribute.String;
    export_to_platforms: Attribute.Relation<
      'api::category.category',
      'manyToMany',
      'api::platform.platform'
    >;
    filters: Attribute.Component<'categories.filters', true>;
    image: Attribute.Media<'images'>;
    isSpecial: Attribute.Boolean &
      Attribute.Required &
      Attribute.DefaultTo<false>;
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
    useRetailPrice: Attribute.Relation<
      'api::category.category',
      'manyToMany',
      'plugin::import-products.importxml'
    >;
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

export interface ApiCouponUsageCouponUsage extends Schema.CollectionType {
  collectionName: 'coupon_usages';
  info: {
    description: '';
    displayName: 'Coupon Usage';
    pluralName: 'coupon-usages';
    singularName: 'coupon-usage';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    appliedAt: Attribute.DateTime;
    coupon: Attribute.Relation<
      'api::coupon-usage.coupon-usage',
      'manyToOne',
      'api::coupon.coupon'
    >;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::coupon-usage.coupon-usage',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    email: Attribute.Email;
    order: Attribute.Relation<
      'api::coupon-usage.coupon-usage',
      'manyToOne',
      'api::order.order'
    >;
    redeemedAt: Attribute.DateTime;
    source: Attribute.String;
    status: Attribute.Enumeration<
      ['issued', 'applied', 'redeemed', 'expired']
    > &
      Attribute.DefaultTo<'issued'>;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::coupon-usage.coupon-usage',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    user: Attribute.Relation<
      'api::coupon-usage.coupon-usage',
      'manyToOne',
      'plugin::users-permissions.user'
    >;
  };
}

export interface ApiCouponCoupon extends Schema.CollectionType {
  collectionName: 'coupons';
  info: {
    description: '';
    displayName: 'Coupon';
    pluralName: 'coupons';
    singularName: 'coupon';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    allowedEmail: Attribute.Email;
    applicableCategories: Attribute.Relation<
      'api::coupon.coupon',
      'manyToMany',
      'api::category.category'
    >;
    applicableProducts: Attribute.Relation<
      'api::coupon.coupon',
      'manyToMany',
      'api::product.product'
    >;
    code: Attribute.String &
      Attribute.Required &
      Attribute.Unique &
      Attribute.SetMinMaxLength<{
        maxLength: 50;
        minLength: 3;
      }>;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::coupon.coupon',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    description: Attribute.String;
    discountType: Attribute.Enumeration<
      ['percentage', 'fixed_amount', 'free_shipping']
    > &
      Attribute.Required &
      Attribute.DefaultTo<'percentage'>;
    discountValue: Attribute.Decimal &
      Attribute.Required &
      Attribute.DefaultTo<0>;
    excludedCategories: Attribute.Relation<
      'api::coupon.coupon',
      'manyToMany',
      'api::category.category'
    >;
    excludedProducts: Attribute.Relation<
      'api::coupon.coupon',
      'manyToMany',
      'api::product.product'
    >;
    generatedCoupons: Attribute.Relation<
      'api::coupon.coupon',
      'oneToMany',
      'api::coupon.coupon'
    >;
    isActive: Attribute.Boolean &
      Attribute.Required &
      Attribute.DefaultTo<true>;
    isPersonalized: Attribute.Boolean & Attribute.DefaultTo<true>;
    isTemplate: Attribute.Boolean & Attribute.DefaultTo<false>;
    parentCoupon: Attribute.Relation<
      'api::coupon.coupon',
      'manyToOne',
      'api::coupon.coupon'
    >;
    restrictions: Attribute.Component<'coupons.restrictions'>;
    trigger: Attribute.Component<'coupons.trigger'>;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'api::coupon.coupon',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    usages: Attribute.Relation<
      'api::coupon.coupon',
      'oneToMany',
      'api::coupon-usage.coupon-usage'
    >;
    validation: Attribute.Component<'coupons.validation'>;
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
        'homepage.hot-or-sale',
        'homepage.categories-banner',
        'homepage.brands-banner',
        'global.carousel',
        'global.site-features'
      ]
    >;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'api::homepage.homepage',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
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
    draftAndPublish: false;
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
    subscribed: Attribute.Boolean &
      Attribute.Required &
      Attribute.DefaultTo<true>;
    subscribedAt: Attribute.DateTime;
    unsubscribedAt: Attribute.DateTime;
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
    Article_39a: Attribute.Component<'order.article-39a'>;
    Bank_info: Attribute.Component<'payment.tran-ticket'> & Attribute.Private;
    billing_address: Attribute.JSON & Attribute.Required;
    comments: Attribute.Component<'shipping.comment', true>;
    coupon_usages: Attribute.Relation<
      'api::order.order',
      'oneToMany',
      'api::coupon-usage.coupon-usage'
    >;
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
    discount: Attribute.Decimal &
      Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Attribute.DefaultTo<0>;
    installments: Attribute.Integer &
      Attribute.Required &
      Attribute.SetMinMax<
        {
          max: 24;
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
        '\u0395\u03C0\u03B9\u03B2\u03B5\u03B2\u03B1\u03B9\u03C9\u03BC\u03AD\u03BD\u03B7',
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
    trackingNumber: Attribute.String;
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
    description: Attribute.String;
    icon: Attribute.Media<'images'>;
    installments: Attribute.Component<'payment.installments'>;
    isActive: Attribute.Boolean &
      Attribute.Required &
      Attribute.DefaultTo<true>;
    method: Attribute.Enumeration<
      [
        'credit_card',
        'debit_card',
        'cash',
        'cash_on_delivery',
        'bank_transfer',
        'iris_payment'
      ]
    > &
      Attribute.Required;
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
    export_statuses: Attribute.Component<'platforms.export-status', true>;
    merchantFeeCatalogue: Attribute.Media<'files'>;
    name: Attribute.String & Attribute.Required;
    only_in_house_inventory: Attribute.Boolean;
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
    clearance_dismissals: Attribute.Relation<
      'api::product.product',
      'oneToMany',
      'plugin::bargain-detector.clearancedismissal'
    >;
    coupons: Attribute.Relation<
      'api::product.product',
      'manyToMany',
      'api::coupon.coupon'
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
    inventory: Attribute.Integer & Attribute.DefaultTo<0>;
    is_archived: Attribute.Boolean;
    is_bargain: Attribute.Boolean & Attribute.DefaultTo<false>;
    is_fixed_price: Attribute.Boolean & Attribute.DefaultTo<false>;
    is_hot: Attribute.Boolean & Attribute.DefaultTo<false>;
    is_in_house: Attribute.Boolean & Attribute.DefaultTo<false>;
    is_sale: Attribute.Boolean & Attribute.DefaultTo<false>;
    last_analysis_at: Attribute.DateTime;
    length: Attribute.Decimal & Attribute.DefaultTo<0>;
    model: Attribute.String;
    mpn: Attribute.String & Attribute.Unique;
    name: Attribute.String & Attribute.Required;
    need_verify: Attribute.Boolean &
      Attribute.Private &
      Attribute.DefaultTo<false>;
    notice_if_available: Attribute.Boolean & Attribute.DefaultTo<false>;
    opportunities: Attribute.Relation<
      'api::product.product',
      'oneToMany',
      'plugin::bargain-detector.bargainopportunity'
    >;
    opportunity_score: Attribute.Integer &
      Attribute.SetMinMax<
        {
          max: 100;
          min: 0;
        },
        number
      >;
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
    purchace_history: Attribute.Component<'products.purchace-history', true>;
    redirect_to_url: Attribute.String;
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
    risk_score: Attribute.Integer &
      Attribute.SetMinMax<
        {
          max: 100;
          min: 0;
        },
        number
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
      [
        'InStock',
        'MediumStock',
        'LowStock',
        'Backorder',
        'IsExpected',
        'AskForPrice',
        'OutOfStock',
        'Discontinued'
      ]
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
    isFreeShipping: Attribute.Boolean &
      Attribute.Required &
      Attribute.DefaultTo<false>;
    name: Attribute.String & Attribute.Required & Attribute.Unique;
    payments: Attribute.Relation<
      'api::shipping.shipping',
      'oneToMany',
      'api::payment.payment'
    >;
    publishedAt: Attribute.DateTime;
    Regions_file: Attribute.Media<'files'>;
    tracking_url: Attribute.String;
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

export interface PluginBargainDetectorAnalysisrun
  extends Schema.CollectionType {
  collectionName: 'bargain_analysis_runs';
  info: {
    description: 'Execution logs of analysis processes';
    displayName: 'Analysis Run';
    pluralName: 'analysisruns';
    singularName: 'analysisrun';
  };
  options: {
    draftAndPublish: false;
    indexes: [
      {
        columns: ['status', 'started_at'];
        name: 'idx_status_started';
      },
      {
        columns: ['trigger'];
        name: 'idx_trigger';
      },
      {
        columns: ['triggered_by_id'];
        name: 'idx_triggered_by';
      },
      {
        columns: ['completed_at'];
        name: 'idx_completed_at';
      }
    ];
  };
  attributes: {
    completed_at: Attribute.DateTime;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::bargain-detector.analysisrun',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    errors: Attribute.JSON;
    execution_time_ms: Attribute.Integer &
      Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    opportunities_found: Attribute.Integer &
      Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Attribute.DefaultTo<0>;
    patterns_detected: Attribute.Integer &
      Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Attribute.DefaultTo<0>;
    performance_metrics: Attribute.JSON;
    products_analyzed: Attribute.Integer &
      Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Attribute.DefaultTo<0>;
    products_skipped: Attribute.Integer &
      Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Attribute.DefaultTo<0>;
    products_total: Attribute.Integer &
      Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Attribute.DefaultTo<0>;
    risks_detected: Attribute.Integer &
      Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Attribute.DefaultTo<0>;
    started_at: Attribute.DateTime & Attribute.Required;
    status: Attribute.Enumeration<
      ['running', 'completed', 'failed', 'partial']
    > &
      Attribute.DefaultTo<'running'>;
    summary: Attribute.JSON;
    trigger: Attribute.Enumeration<['manual', 'cron', 'webhook', 'api']> &
      Attribute.Required;
    triggered_by: Attribute.Relation<
      'plugin::bargain-detector.analysisrun',
      'oneToOne',
      'admin::user'
    >;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'plugin::bargain-detector.analysisrun',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginBargainDetectorBargainopportunity
  extends Schema.CollectionType {
  collectionName: 'bargainopportunity';
  info: {
    displayName: 'Bargain Opportunities';
    pluralName: 'bargainopportunities';
    singularName: 'bargainopportunity';
  };
  options: {
    draftAndPublish: false;
    indexes: [
      {
        columns: ['product_id', 'status'];
        name: 'idx_product_status';
      },
      {
        columns: ['status', 'priority'];
        name: 'idx_status_priority';
      },
      {
        columns: ['analyzed_at'];
        name: 'idx_analyzed_at';
      },
      {
        columns: ['expires_at'];
        name: 'idx_expires_at';
      },
      {
        columns: ['status', 'expires_at'];
        name: 'idx_status_expires';
      },
      {
        columns: ['priority', 'analyzed_at'];
        name: 'idx_priority_analyzed';
      }
    ];
  };
  pluginOptions: {
    'content-manager': {
      visible: true;
    };
    'content-type-builder': {
      visible: true;
    };
  };
  attributes: {
    action_taken: Attribute.Enumeration<['purchased', 'dismissed', 'waiting']> &
      Attribute.DefaultTo<'waiting'>;
    actioned_at: Attribute.DateTime;
    actual_price: Attribute.Decimal;
    actual_quantity: Attribute.Integer;
    analysis_data: Attribute.JSON;
    analyzed_at: Attribute.DateTime & Attribute.Required;
    confidence: Attribute.Enumeration<['low', 'medium', 'high', 'very_high']> &
      Attribute.DefaultTo<'medium'>;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::bargain-detector.bargainopportunity',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    dismissed_as_false_positive: Attribute.Boolean & Attribute.DefaultTo<false>;
    dismissed_at: Attribute.DateTime;
    expires_at: Attribute.DateTime;
    notes: Attribute.Text;
    notification_channels: Attribute.JSON & Attribute.DefaultTo<[]>;
    notified: Attribute.Boolean & Attribute.DefaultTo<false>;
    notified_at: Attribute.DateTime;
    opportunity_score: Attribute.Integer &
      Attribute.SetMinMax<
        {
          max: 100;
          min: 0;
        },
        number
      > &
      Attribute.DefaultTo<0>;
    opportunity_types: Attribute.JSON & Attribute.DefaultTo<[]>;
    outcome: Attribute.Enumeration<
      ['pending', 'true_positive', 'false_positive', 'expired']
    > &
      Attribute.DefaultTo<'pending'>;
    outcome_notes: Attribute.Text;
    priority: Attribute.Enumeration<
      ['low', 'medium', 'high', 'critical', 'flash_clearance']
    > &
      Attribute.Required &
      Attribute.DefaultTo<'medium'>;
    product: Attribute.Relation<
      'plugin::bargain-detector.bargainopportunity',
      'manyToOne',
      'api::product.product'
    >;
    profit_loss: Attribute.Decimal;
    recommendation: Attribute.Enumeration<
      [
        'strong_buy_and_stock',
        'buy_on_demand',
        'opportunistic_stock',
        'watch',
        'wait_for_order',
        'avoid',
        'clearance_urgent',
        'clearance_soon'
      ]
    > &
      Attribute.Required;
    risk_score: Attribute.Integer &
      Attribute.SetMinMax<
        {
          max: 100;
          min: 0;
        },
        number
      > &
      Attribute.DefaultTo<50>;
    status: Attribute.Enumeration<
      ['active', 'purchased', 'dismissed', 'expired']
    > &
      Attribute.DefaultTo<'active'>;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'plugin::bargain-detector.bargainopportunity',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    viewed: Attribute.Boolean & Attribute.DefaultTo<false>;
    viewed_at: Attribute.DateTime;
  };
}

export interface PluginBargainDetectorCategoryconfig
  extends Schema.CollectionType {
  collectionName: 'bargain_category_configs';
  info: {
    description: 'Category-specific rule overrides';
    displayName: 'Category Configuration';
    pluralName: 'categoryconfigs';
    singularName: 'categoryconfig';
  };
  options: {
    draftAndPublish: false;
    indexes: [
      {
        columns: ['category_id'];
        name: 'idx_category';
        unique: true;
      },
      {
        columns: ['is_active'];
        name: 'idx_is_active';
      }
    ];
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: true;
    };
  };
  attributes: {
    category: Attribute.Relation<
      'plugin::bargain-detector.categoryconfig',
      'oneToOne',
      'api::category.category'
    > &
      Attribute.Required &
      Attribute.Unique;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::bargain-detector.categoryconfig',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    is_active: Attribute.Boolean & Attribute.DefaultTo<true>;
    notes: Attribute.Text;
    rule_overrides: Attribute.JSON;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'plugin::bargain-detector.categoryconfig',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginBargainDetectorClearancedismissal
  extends Schema.CollectionType {
  collectionName: 'clearance_dismissals';
  info: {
    description: 'Track clearance opportunities dismissed as false positives';
    displayName: 'Clearance Dismissal';
    pluralName: 'clearancedismissals';
    singularName: 'clearancedismissal';
  };
  options: {
    comment: 'Prevents re-alerting on same clearance detection';
    draftAndPublish: false;
  };
  attributes: {
    confidence_at_dismissal: Attribute.Integer &
      Attribute.Required &
      Attribute.SetMinMax<
        {
          max: 100;
          min: 0;
        },
        number
      >;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::bargain-detector.clearancedismissal',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    dismissed_at: Attribute.DateTime & Attribute.Required;
    dismissed_by: Attribute.String & Attribute.Required;
    notes: Attribute.Text;
    opportunity: Attribute.Relation<
      'plugin::bargain-detector.clearancedismissal',
      'oneToOne',
      'plugin::bargain-detector.bargainopportunity'
    >;
    product: Attribute.Relation<
      'plugin::bargain-detector.clearancedismissal',
      'manyToOne',
      'api::product.product'
    >;
    reason: Attribute.Text;
    signals_at_dismissal: Attribute.JSON & Attribute.Required;
    supplier: Attribute.Relation<
      'plugin::bargain-detector.clearancedismissal',
      'manyToOne',
      'plugin::import-products.importxml'
    >;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'plugin::bargain-detector.clearancedismissal',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginBargainDetectorConfiguration extends Schema.SingleType {
  collectionName: 'bargain_configuration';
  info: {
    description: 'Global configuration for opportunity detection';
    displayName: 'Plugin Configuration';
    pluralName: 'configurations';
    singularName: 'configuration';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    alert_settings: Attribute.JSON &
      Attribute.DefaultTo<{
        clearance_sales: {
          channels: ['email'];
          enabled: true;
          min_confidence: 50;
          send_all: true;
        };
        critical_opportunities: {
          channels: ['email', 'dashboard'];
          enabled: true;
          max_stock: 2;
          min_score: 80;
        };
        daily_digest: {
          enabled: true;
          min_opportunities: 3;
          time: '08:00';
        };
        flash_deals: {
          channels: ['email', 'dashboard'];
          enabled: true;
          min_score: 85;
        };
        inventory_risks: {
          channels: ['dashboard'];
          enabled: true;
          underwater_threshold: -15;
        };
      }>;
    automation: Attribute.JSON &
      Attribute.DefaultTo<{
        analysis_frequency: '0 */3 * * *';
        auto_expire_days: 7;
        batch_size: 100;
        cleanup_days: 30;
      }>;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::bargain-detector.configuration',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    last_modified_at: Attribute.DateTime;
    last_modified_by: Attribute.Relation<
      'plugin::bargain-detector.configuration',
      'oneToOne',
      'admin::user'
    >;
    opportunity_rules: Attribute.JSON &
      Attribute.Required &
      Attribute.DefaultTo<{
        flash_deal: {
          enabled: true;
          max_time_window_hours: 6;
          min_drop_percent: 10;
          urgency_threshold: 15;
        };
        historic_low: {
          confidence_required: 0.7;
          exact_match: true;
          near_threshold: 5;
        };
        inventory_factor: {
          enabled: true;
          low_stock_boost: 20;
          out_of_stock_boost: 30;
          reorder_point_boost: 10;
        };
        multi_supplier: {
          agreement_threshold: 0.8;
          min_suppliers: 2;
          time_window_hours: 24;
        };
        price_drop: {
          low: 10;
          medium: 15;
          minimum: 5;
          strong: 20;
        };
      }>;
    pattern_settings: Attribute.JSON &
      Attribute.DefaultTo<{
        day_of_week: {
          enabled: true;
          min_samples_per_day: 10;
        };
        seasonal: {
          enabled: true;
          look_back_years: 3;
          min_confidence: 0.7;
          min_occurrences: 2;
        };
        supplier_behavior: {
          enabled: true;
          min_correlation: 0.75;
          min_samples: 20;
        };
      }>;
    recommendation_thresholds: Attribute.JSON &
      Attribute.Required &
      Attribute.DefaultTo<{
        avoid: {
          max_risk: 70;
        };
        buy: {
          max_risk: 40;
          min_confidence: 0.65;
          min_opportunity: 65;
        };
        cautious_buy: {
          max_risk: 60;
          min_confidence: 0.5;
          min_opportunity: 50;
        };
        strong_buy: {
          max_risk: 30;
          min_confidence: 0.75;
          min_opportunity: 80;
        };
        watch: {
          max_risk: 50;
          min_opportunity: 40;
        };
      }>;
    risk_rules: Attribute.JSON &
      Attribute.Required &
      Attribute.DefaultTo<{
        inventory_underwater: {
          critical_threshold: -25;
          urgent_threshold: -15;
          warning_threshold: -5;
        };
        supplier_trust: {
          error_tolerance: 0.05;
          min_data_points: 30;
          min_reliability_score: 60;
        };
        volatility: {
          high: 15;
          low: 5;
          medium: 8;
        };
      }>;
    scoring_weights: Attribute.JSON &
      Attribute.Required &
      Attribute.DefaultTo<{
        opportunity: {
          confidence: 10;
          inventory_need: 20;
          price_advantage: 40;
          timing: 30;
        };
        risk: {
          market_position: 35;
          supplier_reliability: 30;
          volatility: 35;
        };
      }>;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'plugin::bargain-detector.configuration',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    version: Attribute.String & Attribute.DefaultTo<'1.0.0'>;
  };
}

export interface PluginBargainDetectorPattern extends Schema.CollectionType {
  collectionName: 'bargain_patterns';
  info: {
    description: 'Historical patterns for prediction';
    displayName: 'Detected Pattern';
    pluralName: 'patterns';
    singularName: 'pattern';
  };
  options: {
    draftAndPublish: false;
    indexes: [
      {
        columns: ['pattern_type', 'scope'];
        name: 'idx_pattern_type_scope';
      },
      {
        columns: ['scope_target'];
        name: 'idx_scope_target';
      },
      {
        columns: ['is_active'];
        name: 'idx_is_active';
      },
      {
        columns: ['confidence'];
        name: 'idx_confidence';
      },
      {
        columns: ['detected_at'];
        name: 'idx_detected_at';
      }
    ];
  };
  attributes: {
    confidence: Attribute.Decimal &
      Attribute.Required &
      Attribute.SetMinMax<
        {
          max: 1;
          min: 0;
        },
        number
      >;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::bargain-detector.pattern',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    detected_at: Attribute.DateTime & Attribute.Required;
    is_active: Attribute.Boolean & Attribute.DefaultTo<true>;
    last_validated: Attribute.DateTime;
    name: Attribute.String & Attribute.Required;
    next_occurrence: Attribute.JSON;
    notes: Attribute.Text;
    pattern_data: Attribute.JSON & Attribute.Required;
    pattern_type: Attribute.Enumeration<
      [
        'seasonal',
        'supplier_behavior',
        'category_trend',
        'day_of_week',
        'monthly_cycle',
        'price_movement'
      ]
    > &
      Attribute.Required;
    scope: Attribute.Enumeration<
      ['product', 'category', 'brand', 'supplier', 'global']
    > &
      Attribute.Required;
    scope_target: Attribute.String;
    times_observed: Attribute.Integer &
      Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Attribute.DefaultTo<0>;
    times_successful: Attribute.Integer &
      Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Attribute.DefaultTo<0>;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'plugin::bargain-detector.pattern',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
  };
}

export interface PluginBargainDetectorRuleexecution
  extends Schema.CollectionType {
  collectionName: 'bargain_rule_executions';
  info: {
    description: 'Audit trail of rule executions';
    displayName: 'Rule Execution History';
    pluralName: 'ruleexecutions';
    singularName: 'ruleexecution';
  };
  options: {
    draftAndPublish: false;
    indexes: [
      {
        columns: ['opportunity_id'];
        name: 'idx_opportunity';
      },
      {
        columns: ['executed_at'];
        name: 'idx_executed_at';
      },
      {
        columns: ['outcome'];
        name: 'idx_outcome';
      }
    ];
  };
  attributes: {
    actual_result: Attribute.JSON;
    calculation_details: Attribute.JSON;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::bargain-detector.ruleexecution',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    executed_at: Attribute.DateTime & Attribute.Required;
    opportunity: Attribute.Relation<
      'plugin::bargain-detector.ruleexecution',
      'manyToOne',
      'plugin::bargain-detector.bargainopportunity'
    > &
      Attribute.Required;
    outcome: Attribute.Enumeration<
      ['pending', 'true_positive', 'false_positive', 'missed', 'expired']
    > &
      Attribute.DefaultTo<'pending'>;
    outcome_notes: Attribute.Text;
    rules_snapshot: Attribute.JSON & Attribute.Required;
    signals_detected: Attribute.JSON & Attribute.Required;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'plugin::bargain-detector.ruleexecution',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
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

export interface PluginImportProductsBrandexclmap
  extends Schema.CollectionType {
  collectionName: 'brandexclmaps';
  info: {
    displayName: 'brandexclmaps';
    pluralName: 'brandexclmaps';
    singularName: 'brandexclmap';
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
    brand_name: Attribute.String & Attribute.Required;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::import-products.brandexclmap',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    related_import: Attribute.Relation<
      'plugin::import-products.brandexclmap',
      'manyToOne',
      'plugin::import-products.importxml'
    >;
    updatedAt: Attribute.DateTime;
    updatedBy: Attribute.Relation<
      'plugin::import-products.brandexclmap',
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
    brand_excl_map: Attribute.Relation<
      'plugin::import-products.importxml',
      'oneToMany',
      'plugin::import-products.brandexclmap'
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
    has_quantity: Attribute.Boolean & Attribute.DefaultTo<false>;
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
    min_quantity: Attribute.Integer &
      Attribute.SetMinMax<
        {
          max: 100;
          min: 0;
        },
        number
      >;
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
    useRetailPrice: Attribute.Boolean & Attribute.DefaultTo<false>;
    useRetailPriceBrands: Attribute.Relation<
      'plugin::import-products.importxml',
      'manyToMany',
      'api::brand.brand'
    >;
    useRetailPriceCategories: Attribute.Relation<
      'plugin::import-products.importxml',
      'manyToMany',
      'api::category.category'
    >;
    useRetailPriceContainName: Attribute.Component<
      'imports.use-retail-price',
      true
    >;
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
    allow_import: Attribute.Boolean & Attribute.DefaultTo<false>;
    createdAt: Attribute.DateTime;
    createdBy: Attribute.Relation<
      'plugin::import-products.stockmap',
      'oneToOne',
      'admin::user'
    > &
      Attribute.Private;
    name_in_xml: Attribute.String & Attribute.Required;
    related_import: Attribute.Relation<
      'plugin::import-products.stockmap',
      'manyToOne',
      'plugin::import-products.importxml'
    >;
    translate_to: Attribute.Enumeration<
      [
        'InStock',
        'MediumStock',
        'LowStock',
        'Backorder',
        'IsExpected',
        'AskForPrice',
        'OutOfStock',
        'Discontinued'
      ]
    > &
      Attribute.Required &
      Attribute.DefaultTo<'InStock'>;
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
    coupon_usages: Attribute.Relation<
      'plugin::users-permissions.user',
      'oneToMany',
      'api::coupon-usage.coupon-usage'
    >;
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
      'api::coupon-usage.coupon-usage': ApiCouponUsageCouponUsage;
      'api::coupon.coupon': ApiCouponCoupon;
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
      'plugin::bargain-detector.analysisrun': PluginBargainDetectorAnalysisrun;
      'plugin::bargain-detector.bargainopportunity': PluginBargainDetectorBargainopportunity;
      'plugin::bargain-detector.categoryconfig': PluginBargainDetectorCategoryconfig;
      'plugin::bargain-detector.clearancedismissal': PluginBargainDetectorClearancedismissal;
      'plugin::bargain-detector.configuration': PluginBargainDetectorConfiguration;
      'plugin::bargain-detector.pattern': PluginBargainDetectorPattern;
      'plugin::bargain-detector.ruleexecution': PluginBargainDetectorRuleexecution;
      'plugin::content-releases.release': PluginContentReleasesRelease;
      'plugin::content-releases.release-action': PluginContentReleasesReleaseAction;
      'plugin::email-designer.email-template': PluginEmailDesignerEmailTemplate;
      'plugin::i18n.locale': PluginI18NLocale;
      'plugin::import-products.blacklistmap': PluginImportProductsBlacklistmap;
      'plugin::import-products.brandexclmap': PluginImportProductsBrandexclmap;
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
