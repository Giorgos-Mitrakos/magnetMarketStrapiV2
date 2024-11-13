import type { Attribute, Schema } from '@strapi/strapi';

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

export interface CategoriesFilters extends Schema.Component {
  collectionName: 'components_categories_filters';
  info: {
    displayName: 'Filters';
  };
  attributes: {
    name: Attribute.String;
  };
}

export interface CategoriesPercentage extends Schema.Component {
  collectionName: 'components_categories_percentages';
  info: {
    description: '';
    displayName: 'percentage';
  };
  attributes: {
    add_to_price: Attribute.Decimal &
      Attribute.Required &
      Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Attribute.DefaultTo<0>;
    brand_perc: Attribute.Component<'categories.brand-percent', true>;
    name: Attribute.Enumeration<['general', 'skroutz', 'shopflix']>;
    percentage: Attribute.Decimal;
  };
}

export interface GlobalBanner extends Schema.Component {
  collectionName: 'components_global_banners';
  info: {
    description: '';
    displayName: 'Banner';
  };
  attributes: {
    href: Attribute.String & Attribute.Required;
    image: Attribute.Media<'images'> & Attribute.Required;
    link_label: Attribute.String;
    target: Attribute.Enumeration<['_blank']>;
  };
}

export interface GlobalLink extends Schema.Component {
  collectionName: 'components_global_links';
  info: {
    description: '';
    displayName: 'link';
  };
  attributes: {
    href: Attribute.String;
    isLink: Attribute.Boolean;
    label: Attribute.String;
    target: Attribute.Enumeration<['_blank']>;
  };
}

export interface GlobalLinkSection extends Schema.Component {
  collectionName: 'components_global_link_sections';
  info: {
    displayName: 'link_section';
  };
  attributes: {
    Label: Attribute.String;
    links: Attribute.Component<'global.link', true>;
  };
}

export interface HomepageBannerListProducts extends Schema.Component {
  collectionName: 'components_homepage_banner_list_products';
  info: {
    description: '';
    displayName: 'ListProductsBanner';
  };
  attributes: {
    products: Attribute.Relation<
      'homepage.banner-list-products',
      'oneToMany',
      'api::product.product'
    >;
    subtitle: Attribute.String;
    title: Attribute.String;
  };
}

export interface HomepageCategoryBanner extends Schema.Component {
  collectionName: 'components_homepage_category_banners';
  info: {
    displayName: 'categoryBanner';
  };
  attributes: {
    category: Attribute.Relation<
      'homepage.category-banner',
      'oneToOne',
      'api::category.category'
    >;
    image: Attribute.Media<'images', true>;
    subtitle: Attribute.String;
    title: Attribute.String;
  };
}

export interface HomepageDoubleBanner extends Schema.Component {
  collectionName: 'components_homepage_double_banners';
  info: {
    description: '';
    displayName: 'Double Banner';
  };
  attributes: {
    leftBanner: Attribute.Media<'images'> & Attribute.Required;
    leftHref: Attribute.String & Attribute.Required;
    leftTarget: Attribute.Enumeration<['_blank']>;
    rightBanner: Attribute.Media<'images'> & Attribute.Required;
    rightHref: Attribute.String & Attribute.Required;
    rightTarget: Attribute.Enumeration<['_blank']>;
  };
}

export interface HomepageHotOrSale extends Schema.Component {
  collectionName: 'components_homepage_hot_or_sales';
  info: {
    description: '';
    displayName: 'Hot, Sale or New';
  };
  attributes: {
    title: Attribute.String;
    type: Attribute.Enumeration<['hot', 'sale', 'new']>;
  };
}

export interface HomepageSingleBanner extends Schema.Component {
  collectionName: 'components_homepage_single_banners';
  info: {
    description: '';
    displayName: 'single banner';
  };
  attributes: {
    href: Attribute.String & Attribute.Required;
    singleBanner: Attribute.Media<'images'> & Attribute.Required;
    target: Attribute.Enumeration<['_blank']>;
  };
}

export interface HomepageTripleBanner extends Schema.Component {
  collectionName: 'components_homepage_triple_banners';
  info: {
    description: '';
    displayName: 'Triple Banner';
  };
  attributes: {
    leftTripleBanner: Attribute.Media<'images'> & Attribute.Required;
    leftTripleHref: Attribute.String & Attribute.Required;
    leftTripleTarget: Attribute.Enumeration<['_blank']>;
    middleTripleBanner: Attribute.Media<'images'> & Attribute.Required;
    middleTripleHref: Attribute.String & Attribute.Required;
    middleTripleTarget: Attribute.Enumeration<['_blank']>;
    rightTripleBanner: Attribute.Media<'images'>;
    rightTripleHref: Attribute.String;
    rightTripleTarget: Attribute.Enumeration<['_blank']>;
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

export interface PaymentRange extends Schema.Component {
  collectionName: 'components_payment_ranges';
  info: {
    displayName: 'range';
  };
  attributes: {
    maximum: Attribute.Decimal;
    minimum: Attribute.Decimal &
      Attribute.Required &
      Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Attribute.DefaultTo<0>;
  };
}

export interface ProductsChars extends Schema.Component {
  collectionName: 'components_products_chars';
  info: {
    description: '';
    displayName: 'Chars';
  };
  attributes: {
    name: Attribute.String & Attribute.Required;
    value: Attribute.Text;
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
    description: '';
    displayName: 'Info';
  };
  attributes: {
    in_offer: Attribute.Boolean & Attribute.DefaultTo<false>;
    in_stock: Attribute.Boolean & Attribute.DefaultTo<true>;
    initial_retail_price: Attribute.Decimal;
    name: Attribute.String;
    price_progress: Attribute.Component<'products.price-progress', true>;
    quantity: Attribute.Integer;
    recycle_tax: Attribute.Decimal &
      Attribute.Required &
      Attribute.DefaultTo<0>;
    retail_price: Attribute.Decimal;
    supplierProductId: Attribute.String;
    supplierProductURL: Attribute.String;
    wholesale: Attribute.Decimal & Attribute.Required;
  };
}

export interface ProductsPlatform extends Schema.Component {
  collectionName: 'components_products_platforms';
  info: {
    description: '';
    displayName: 'platform';
  };
  attributes: {
    averageRating: Attribute.Decimal;
    category: Attribute.String;
    code_in_platform: Attribute.String;
    forced_scrap_times: Attribute.Integer & Attribute.DefaultTo<0>;
    is_fixed_price: Attribute.Boolean &
      Attribute.Required &
      Attribute.DefaultTo<false>;
    last_scrap: Attribute.DateTime;
    numberOfReviews: Attribute.Integer & Attribute.DefaultTo<0>;
    platform: Attribute.Enumeration<['Skroutz', 'Shopflix']>;
    price: Attribute.Decimal & Attribute.Required;
    proposed_shop: Attribute.String;
    shops: Attribute.Component<'products.shop', true>;
    title_in_platform: Attribute.String;
    url: Attribute.String;
  };
}

export interface ProductsPriceProgress extends Schema.Component {
  collectionName: 'components_products_price_progresses';
  info: {
    displayName: 'Price Progress';
  };
  attributes: {
    date: Attribute.DateTime;
    discount: Attribute.Decimal;
    in_offer: Attribute.Boolean & Attribute.DefaultTo<false>;
    initial_wholesale: Attribute.Decimal;
    wholesale: Attribute.Decimal & Attribute.Required;
  };
}

export interface ProductsShop extends Schema.Component {
  collectionName: 'components_products_shops';
  info: {
    description: '';
    displayName: 'shop';
  };
  attributes: {
    availability: Attribute.String & Attribute.Required;
    is_express: Attribute.Boolean &
      Attribute.Required &
      Attribute.DefaultTo<false>;
    is_pro: Attribute.Boolean & Attribute.DefaultTo<false>;
    marketplace_shipping: Attribute.Decimal & Attribute.DefaultTo<0>;
    name: Attribute.String & Attribute.Required;
    price: Attribute.Decimal;
    shop_shipping: Attribute.Decimal & Attribute.DefaultTo<0>;
  };
}

export interface SharedMetaSocial extends Schema.Component {
  collectionName: 'components_shared_meta_socials';
  info: {
    displayName: 'MetaSocial';
  };
  attributes: {
    description: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        maxLength: 65;
      }>;
    image: Attribute.Media<'images' | 'files' | 'videos', true>;
    socialNetwork: Attribute.Enumeration<['Facebook', 'Twitter']> &
      Attribute.Required;
    title: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
  };
}

export interface SharedSeo extends Schema.Component {
  collectionName: 'components_shared_seos';
  info: {
    displayName: 'Seo';
  };
  attributes: {
    canonicalURL: Attribute.String;
    keywords: Attribute.Text;
    metaDescription: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    metaImage: Attribute.Media<'images' | 'files' | 'videos'> &
      Attribute.Required;
    metaRobots: Attribute.String;
    metaSocial: Attribute.Component<'shared.meta-social', true>;
    metaTitle: Attribute.String &
      Attribute.Required &
      Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    metaViewport: Attribute.String;
    structuredData: Attribute.JSON;
  };
}

export interface ShippingComment extends Schema.Component {
  collectionName: 'components_shipping_comments';
  info: {
    displayName: 'comment';
  };
  attributes: {
    comment: Attribute.Text;
    date: Attribute.DateTime;
    type: Attribute.Enumeration<
      [
        '\u03A0\u03B5\u03BB\u03AC\u03C4\u03B7',
        '\u03A0\u03C1\u03BF\u03C3\u03C9\u03C0\u03B9\u03BA\u03AE'
      ]
    >;
  };
}

export interface ShippingDisprosites extends Schema.Component {
  collectionName: 'components_shipping_disprosites';
  info: {
    displayName: 'disprosites';
  };
  attributes: {
    postal: Attribute.String;
    region: Attribute.String;
    state: Attribute.String;
  };
}

export interface ShippingFees extends Schema.Component {
  collectionName: 'components_shipping_fees';
  info: {
    displayName: 'fees';
  };
  attributes: {
    basic_fee: Attribute.Decimal & Attribute.Required;
    basic_weight: Attribute.Decimal & Attribute.Required;
    fee_above_weight: Attribute.Decimal & Attribute.Required;
  };
}

export interface ShippingMethod extends Schema.Component {
  collectionName: 'components_shipping_methods';
  info: {
    description: '';
    displayName: 'method';
  };
  attributes: {
    cost: Attribute.Decimal & Attribute.Required & Attribute.DefaultTo<0>;
    name: Attribute.String & Attribute.Required;
  };
}

export interface ShippingZone extends Schema.Component {
  collectionName: 'components_shipping_zones';
  info: {
    description: '';
    displayName: 'zone';
  };
  attributes: {
    fees: Attribute.Component<'shipping.fees'>;
    name: Attribute.Enumeration<
      [
        '\u03A7\u03B5\u03C1\u03C3\u03B1\u03AF\u03BF\u03B9 \u03A0\u03C1\u03BF\u03BF\u03C1\u03B9\u03C3\u03BC\u03BF\u03AF',
        '\u039D\u03B7\u03C3\u03B9\u03C9\u03C4\u03B9\u03BA\u03BF\u03AF \u03A0\u03C1\u03BF\u03BF\u03C1\u03B9\u03C3\u03BC\u03BF\u03AF'
      ]
    >;
    states: Attribute.Relation<
      'shipping.zone',
      'oneToMany',
      'api::state.state'
    >;
  };
}

declare module '@strapi/types' {
  export module Shared {
    export interface Components {
      'categories.brand-percent': CategoriesBrandPercent;
      'categories.filters': CategoriesFilters;
      'categories.percentage': CategoriesPercentage;
      'global.banner': GlobalBanner;
      'global.link': GlobalLink;
      'global.link-section': GlobalLinkSection;
      'homepage.banner-list-products': HomepageBannerListProducts;
      'homepage.category-banner': HomepageCategoryBanner;
      'homepage.double-banner': HomepageDoubleBanner;
      'homepage.hot-or-sale': HomepageHotOrSale;
      'homepage.single-banner': HomepageSingleBanner;
      'homepage.triple-banner': HomepageTripleBanner;
      'imports.contains-name': ImportsContainsName;
      'payment.range': PaymentRange;
      'products.chars': ProductsChars;
      'products.images-supplier-urls': ProductsImagesSupplierUrls;
      'products.info': ProductsInfo;
      'products.platform': ProductsPlatform;
      'products.price-progress': ProductsPriceProgress;
      'products.shop': ProductsShop;
      'shared.meta-social': SharedMetaSocial;
      'shared.seo': SharedSeo;
      'shipping.comment': ShippingComment;
      'shipping.disprosites': ShippingDisprosites;
      'shipping.fees': ShippingFees;
      'shipping.method': ShippingMethod;
      'shipping.zone': ShippingZone;
    }
  }
}
