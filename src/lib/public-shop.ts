// This deployment runs one shop (GJ5 Home Service) even though the
// underlying schema is tenant-scoped by `user_email` for every ERP table.
// The public customer website has no shop-selection UI, so every public
// route resolves "which shop's repair_jobs/customers rows do I read or
// write" through this single function rather than hardcoding the email
// inline in several places. Override via SHOP_TENANT_EMAIL if this
// deployment's owner account is ever not the seeded 'admin@gj5.com'
// (see sql/migrations/006_owner_credentials_and_webauthn.sql).
export function getShopTenantEmail(): string {
  return process.env.SHOP_TENANT_EMAIL || 'admin@gj5.com';
}
