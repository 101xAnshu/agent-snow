import { api } from "./api-client.js";
import open from "open";

export async function openUpgradeCheckout(): Promise<void> {
  const response = await api.getCheckoutUrl();
  const url = response.checkoutUrl;
  
  if (!url) {
    throw new Error("No checkout URL returned from server");
  }
  
  await open(url);
}

export async function openBillingPortal(): Promise<void> {
  const response = await api.getBillingPortalUrl();
  const url = response.portalUrl;
  
  if (!url) {
    throw new Error("No portal URL returned from server");
  }
  
  await open(url);
}
