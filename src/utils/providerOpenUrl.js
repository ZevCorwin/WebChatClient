export function providerOpenUrl(email) {
  if (!email) return null;
  const domain = email.split("@")[1]?.toLowerCase() || "";
  if (domain.includes("gmail.")) return "https://mail.google.com/mail/u/0/#inbox";
  if (domain.includes("yahoo.")) return "https://mail.yahoo.com/";
  if (domain.includes("outlook.") || domain.includes("hotmail.") || domain.includes("live."))
    return "https://outlook.live.com/mail/0/inbox";
  return null;
}
