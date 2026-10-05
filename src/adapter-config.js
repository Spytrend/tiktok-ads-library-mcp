const pinTikTok = { inject: { source: "tiktok" }, removeProperties: ["source"] };

// Server parameter notes about Spytrend web app pages (/ads, /advertisers, …) and the Meta corpus do not
// apply to this TikTok-only adapter, nor do notes about pixel or IP lookups: such sentences are dropped.
const tiktokOnly = ["(^|[^\\w.:/-])/[a-z]", "spytrend\\.com/[a-z]", "\\bpixels?\\b", "pixel_id", "resolved_ip", "\\bIPs?\\b", "\\bMeta\\b", "\\bFacebook\\b", "facebook\\.com"];
// The filters the hosted server honours for TikTok. Everything else is a Meta-corpus filter:
// not published, and a call that sets one is refused by the adapter.
const tiktokAdFilters = [
  "query", "search_in", "country", "countries", "country_match", "categories", "ai_subcategory",
  "languages", "formats", "landing_domain", "advertiser_id", "tiktok_advertiser_id", "contains_in_links",
  "media_type", "cta_buttons", "domain_zones", "status_today", "min_days_active", "days_active_to",
  "max_countries", "dedupe", "date_from", "date_to", "sort_by", "sort_order", "limit", "cursor"
];
const tiktokAdvertiserFilters = [
  "query", "domain", "countries", "min_geo_share", "exclude_countries", "ai_category", "min_total_ads",
  "min_active_ads", "date_from", "date_to", "has_funder", "sort_by", "sort_order", "offset", "limit"
];

// Pixel and IP lookups are internal signals: never published, a call that sets one is refused.
const internalLookups = ["pixel_id", "resolved_ip"];

export const adapterConfig = {
  rejectProperties: internalLookups,
  source: "tiktok",
  title: "TikTok Ads Library",
  dropTerms: tiktokOnly,
  // The hosted server calls TikTok advertisers by its own name; parameter notes
  // are rewritten into this adapter's vocabulary.
  vocabulary: [
    ["Webmasters", "Advertisers"],
    ["webmasters", "advertisers"],
    ["Webmaster", "Advertiser"],
    ["webmaster", "advertiser"]
  ],
  instructions: [
    "TikTok ad research over the hosted Spytrend database. The source is fixed to TikTok.",
    "TikTok data needs the Pro plan or higher: every delivered TikTok ad row or advertiser card costs 100 Spytrend tokens, so ask for small limits (the default page is 10 rows). Free and Starter accounts get an upgrade refusal, never a charge — report it to the user instead of retrying.",
    "Typical flow: search_tiktok_ads with narrow filters, show the rows to the user, open the ones they pick with get_tiktok_ad. To see who runs ads, use search_tiktok_advertisers and get_tiktok_advertiser; to list one advertiser's ads, pass its id as tiktok_advertiser_id to search_tiktok_ads.",
    "Media links come inside TikTok rows; there is no separate media download for TikTok ids. get_usage is free. Do not loop retries on a paid call.",
    "Errors carry structuredContent.error with kind and retryable; retry only when retryable is true."
  ].join(" "),
  tools: {
    search_tiktok_ads: {
      remoteName: "search_ads",
      ...pinTikTok,
      allowProperties: tiktokAdFilters,
      // The server reads these as the category filter of this tool (accepted, sent as is).
      aliases: { ai_category: "categories", ai_categories: "categories", category: "categories" },
      renameProperties: { tiktok_advertiser_id: "webmaster_id" },
      enums: { status_today: ["active", "inactive"], sort_by: ["date", "days_active"] },
      properties: {
        contains_in_links: "match a fragment inside the ad's tracking links, e.g. a sub id or a UTM fragment like 'sub1=' or 'utm_campaign=xyz'",
        tiktok_advertiser_id: "only ads from this TikTok advertiser: an id from `search_tiktok_advertisers` or `get_tiktok_advertiser`",
        advertiser_id: "only ads from this TikTok advertiser account: the advertiser_id field of a TikTok ad row",
        formats: "creative formats: single, carousel or video",
        status_today: "current status: active (shown within the last 3 calendar days) or inactive",
        sort_by: "order results by: date (default, newest first) or days_active",
        date_from: "delivery-window overlap: only ads whose last delivery date is on or after this date (YYYY-MM-DD), not necessarily the launch date. Combine with date_to in a closed window of at most 31 calendar days for an exact in-call total.",
        date_to: "delivery-window overlap: only ads whose first delivery date is on or before this date (YYYY-MM-DD)",
        limit: "max ad rows to return (default 10, maximum 200); every delivered TikTok row costs 100 tokens"
      },
      title: "Search TikTok ads",
      description: "Search TikTok ads by text, country, category or landing domain. TikTok only — the source is fixed by this adapter. TikTok rows are premium: 100 Spytrend tokens per delivered row, Pro plan or higher; the default page is 10 rows, ask for fewer when sampling."
    },
    get_tiktok_ad: {
      remoteName: "get_ad",
      ...pinTikTok,
      allowProperties: ["id"],
      properties: { id: "the TikTok ad id from `search_tiktok_ads`" },
      title: "Get TikTok ad",
      description: "Open one TikTok ad by an id from `search_tiktok_ads`: ad copy, destination link, run dates. 100 tokens. Media download is not available for TikTok ids."
    },
    search_tiktok_advertisers: {
      remoteName: "search_webmasters",
      ...pinTikTok,
      allowProperties: tiktokAdvertiserFilters,
      aliases: { categories: "ai_category", ai_categories: "ai_category" },
      properties: {
        query: "free-text advertiser name to search for",
        has_funder: "keep only advertisers with an external 'paid for by' sponsor (the funded-by filter)",
        ai_category: "dominant AI category slug (e.g. gambling_and_betting)",
        sort_by: "order by: total_ads (default), active_ads, created_at or relevance (ranks by ad volume in the selected countries; needs countries)",
        limit: "max results (default 10, at most 100); every delivered TikTok advertiser row costs 100 tokens"
      },
      title: "Search TikTok advertisers",
      description: "Find the advertiser operations behind TikTok ads: who runs them, with their domains and pages. Returns ids for `get_tiktok_advertiser`. 100 tokens per row, Pro plan or higher."
    },
    get_tiktok_advertiser: {
      remoteName: "get_webmaster",
      ...pinTikTok,
      // The TikTok card is not windowed: the server takes only the id for TikTok.
      allowProperties: ["id"],
      properties: { id: "the TikTok advertiser id from `search_tiktok_advertisers`" },
      title: "Get TikTok advertiser",
      description: "One TikTok advertiser operation by id: domains, pages, countries and ad volume. 100 tokens."
    },
    get_usage: {
      remoteName: "get_usage",
      title: "Plan and token balance",
      description: "Your Spytrend plan and remaining token quota, including what TikTok rows draw from. Free."
    }
  }
};
