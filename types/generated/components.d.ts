import type { Schema, Attribute } from '@strapi/strapi';

export interface CategoriesBrandPercent extends Schema.Component {
  collectionName: 'components_categories_brand_percents';
  info: {
    displayName: 'brand_percent';
  };
  attributes: {
    brand: Attribute.Relation<
      'categories.brand-percent',
      'oneToOne',
      'api::brand.brand'
    >;
    percentage: Attribute.Decimal & Attribute.Required;
  };
}

export interface CategoriesPercentage extends Schema.Component {
  collectionName: 'components_categories_percentages';
  info: {
    displayName: 'percentage';
    description: '';
  };
  attributes: {
    percentage: Attribute.Decimal;
    brand_perc: Attribute.Component<'categories.brand-percent', true>;
    add_to_price: Attribute.Decimal &
      Attribute.Required &
      Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Attribute.DefaultTo<0>;
    name: Attribute.Enumeration<['general', 'skroutz', 'shopflix']>;
  };
}

export interface ImportsContainsName extends Schema.Component {
  collectionName: 'components_imports_contains_names';
  info: {
    displayName: 'contains-name';
  };
  attributes: {
    name: Attribute.String & Attribute.Required;
    value: Attribute.String & Attribute.Required;
  };
}

export interface ProductsChars extends Schema.Component {
  collectionName: 'components_products_chars';
  info: {
    displayName: 'Chars';
  };
  attributes: {
    name: Attribute.String & Attribute.Required;
    value: Attribute.String;
  };
}

export interface ProductsImagesSupplierUrls extends Schema.Component {
  collectionName: 'components_products_images_supplier_urls';
  info: {
    displayName: 'imagesSupplierURLS';
  };
  attributes: {
    url: Attribute.String;
  };
}

export interface ProductsInfo extends Schema.Component {
  collectionName: 'components_products_infos';
  info: {
    displayName: 'Info';
    description: '';
  };
  attributes: {
    name: Attribute.String;
    supplierProductId: Attribute.String;
    wholesale: Attribute.Decimal & Attribute.Required;
    quantity: Attribute.Integer;
    supplierProductURL: Attribute.String;
    recycle_tax: Attribute.Decimal &
      Attribute.Required &
      Attribute.DefaultTo<0>;
    in_offer: Attribute.Boolean & Attribute.DefaultTo<false>;
    initial_retail_price: Attribute.Decimal;
    retail_price: Attribute.Decimal;
    in_stock: Attribute.Boolean & Attribute.DefaultTo<true>;
    price_progress: Attribute.Component<'products.price-progress', true>;
  };
}

export interface ProductsPlatform extends Schema.Component {
  collectionName: 'components_products_platforms';
  info: {
    displayName: 'platform';
    description: '';
  };
  attributes: {
    price: Attribute.Decimal & Attribute.Required;
    is_fixed_price: Attribute.Boolean &
      Attribute.Required &
      Attribute.DefaultTo<false>;
    title_in_platform: Attribute.String;
    code_in_platform: Attribute.String;
    category: Attribute.String;
    url: Attribute.String;
    last_scrap: Attribute.DateTime;
    forced_scrap_times: Attribute.Integer & Attribute.DefaultTo<0>;
    averageRating: Attribute.Decimal;
    numberOfReviews: Attribute.Integer & Attribute.DefaultTo<0>;
    platform: Attribute.Enumeration<['Skroutz', 'Shopflix']>;
    proposed_shop: Attribute.String;
    shops: Attribute.Component<'products.shop', true>;
  };
}

export interface ProductsPriceProgress extends Schema.Component {
  collectionName: 'components_products_price_progresses';
  info: {
    displayName: 'Price Progress';
  };
  attributes: {
    date: Attribute.DateTime;
    wholesale: Attribute.Decimal & Attribute.Required;
    in_offer: Attribute.Boolean & Attribute.DefaultTo<false>;
    discount: Attribute.Decimal;
    initial_wholesale: Attribute.Decimal;
  };
}

export interface ProductsShop extends Schema.Component {
  collectionName: 'components_products_shops';
  info: {
    displayName: 'shop';
    description: '';
  };
  attributes: {
    name: Attribute.String & Attribute.Required;
    availability: Attribute.String & Attribute.Required;
    is_pro: Attribute.Boolean & Attribute.DefaultTo<false>;
    is_express: Attribute.Boolean &
      Attribute.Required &
      Attribute.DefaultTo<false>;
    price: Attribute.Decimal;
    marketplace_shipping: Attribute.Decimal & Attribute.DefaultTo<0>;
    shop_shipping: Attribute.Decimal & Attribute.DefaultTo<0>;
  };
}

export interface SharedMetaSocial extends Schema.Component {
  collectionName: 'components_shared_meta_socials';
  info: {
    displayName: 'MetaSocial';
  };
  attributes: {
    socialNetwork: Attribute.Enumeration<['Facebook', 'Twitter']> &
      Attribute.Required;
    title: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    description: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        maxLength: 65;
      }>;
    image: Attribute.Media<'images' | 'files' | 'videos', true>;
  };
}

export interface SharedSeo extends Schema.Component {
  collectionName: 'components_shared_seos';
  info: {
    displayName: 'Seo';
  };
  attributes: {
    metaTitle: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    metaDescription: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    metaImage: Attribute.Media<'images' | 'files' | 'videos'> &
      Attribute.Required;
    metaSocial: Attribute.Component<'shared.meta-social', true>;
    keywords: Attribute.Text;
    metaRobots: Attribute.String;
    structuredData: Attribute.JSON;
    metaViewport: Attribute.String;
    canonicalURL: Attribute.String;
  };
}

declare module '@strapi/types' {
  export module Shared {
    export interface Components {
      'categories.brand-percent': CategoriesBrandPercent;
      'categories.percentage': CategoriesPercentage;
      'imports.contains-name': ImportsContainsName;
      'products.chars': ProductsChars;
      'products.images-supplier-urls': ProductsImagesSupplierUrls;
      'products.info': ProductsInfo;
      'products.platform': ProductsPlatform;
      'products.price-progress': ProductsPriceProgress;
      'products.shop': ProductsShop;
      'shared.meta-social': SharedMetaSocial;
      'shared.seo': SharedSeo;
    }
  }
}
