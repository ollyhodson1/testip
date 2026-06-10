function nowLabel() {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date());
}

function todayLabel() {
  return new Intl.DateTimeFormat("en-GB").format(new Date());
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function allRequiredRecipientsSelected(selectedRecipients) {
  const selected = new Set(selectedRecipients.map((contact) => contact.id));
  return window.REQUIRED_CONTACTS.every((contact) => selected.has(contact.id));
}

function validateSend(compose) {
  if (!allRequiredRecipientsSelected(compose.to)) {
    return "Please add Chris Doogan, PEF / Link Nurse, before sending.";
  }

  if (!compose.subject.trim()) {
    return "Please add a clear subject line so the concern is easy to identify and prioritise.";
  }

  if (!compose.attachments || !compose.attachments.includes("IPform.docx")) {
    return "Please attach the completed IP form before sending this email to the PEF / Link Nurse.";
  }

  if (!compose.body.trim()) {
    return "Please add a brief summary before sending the email.";
  }

  if (countWords(compose.body) < 30) {
    return "Slightly more detail is needed before sending. Briefly include what happened, that the incident form and IP form have been completed, and that the IP form is attached for the PEF team to review.";
  }

  return "";
}

function contactDisplay(contact) {
  return `${contact.name} <${contact.email}>`;
}
