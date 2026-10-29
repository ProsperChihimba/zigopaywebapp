import "server-only";
import type { CallResult } from "./result";

/**
 * Sends a PDF to a WhatsApp number with a caption.
 * The provider is not chosen yet, so this reports "not configured" until it is wired up.
 */
export async function sendWhatsAppDocument(to: string, documentUrl: string, filename: string, caption: string): Promise<CallResult> {
  void to;
  void documentUrl;
  void filename;
  void caption;
  return { ok: false, notConfigured: true, error: "WhatsApp is not configured yet: the provider still has to be connected" };
}
