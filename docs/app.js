const state = {
  emails: [...window.INITIAL_EMAILS],
  activeFolder: "Inbox",
  selectedId: "final-becca-luke-escalation-reply",
  query: "",
  showCompose: false,
  compose: { to: [], subject: "", body: "", attachments: [] },
  showPicker: false,
  showAttachmentPicker: false,
  toastTimer: null,
  replyTimer: null,
  simTime: new Date()
};

function showToast(message, duration = 3200) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.remove("hidden");

  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => toast.classList.add("hidden"), duration);
}

function filteredEmails() {
  const term = state.query.trim().toLowerCase();

  return state.emails.filter((email) => {
    const matchesFolder = email.folder === state.activeFolder;
    const matchesSearch =
      !term ||
      email.sender.toLowerCase().includes(term) ||
      email.subject.toLowerCase().includes(term) ||
      email.body.join(" ").toLowerCase().includes(term) ||
      email.category.toLowerCase().includes(term);

    return matchesFolder && matchesSearch;
  });
}

function folderCounts() {
  return state.emails.reduce((acc, email) => {
    if (!acc[email.folder]) {
      acc[email.folder] = { total: 0, unread: 0 };
    }

    acc[email.folder].total += 1;

    if (email.unread) {
      acc[email.folder].unread += 1;
    }

    return acc;
  }, {});
}

function selectedEmail() {
  return state.emails.find((email) => email.id === state.selectedId) || filteredEmails()[0] || null;
}

function scrollReadingPaneToTop() {
  const pane = document.getElementById("readingPane");
  const panelBody = pane ? pane.querySelector(".panel-body") : null;

  if (panelBody) {
    panelBody.scrollTop = 0;
  }

  if (pane) {
    pane.scrollTop = 0;
  }
}


function finalClockTimeLabel() {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(state.simTime || new Date());
}

function finalClockDateLabel() {
  return new Intl.DateTimeFormat("en-GB").format(state.simTime || new Date());
}

function finalAddMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}

function finalFastForwardClock(minutes, callback) {
  const overlay = document.getElementById("timeOverlay");
  const bigClock = document.getElementById("bigClock");
  const start = new Date(state.simTime || new Date());
  const steps = 20;
  let step = 0;

  if (!overlay || !bigClock) {
    state.simTime = finalAddMinutes(start, minutes);
    updateClock();
    callback();
    return;
  }

  overlay.classList.remove("hidden");
  bigClock.textContent = finalClockTimeLabel();

  const timer = window.setInterval(() => {
    step += 1;
    state.simTime = finalAddMinutes(start, Math.round((minutes / steps) * step));
    bigClock.textContent = finalClockTimeLabel();
    updateClock();

    if (step >= steps) {
      window.clearInterval(timer);
      state.simTime = finalAddMinutes(start, minutes);
      bigClock.textContent = finalClockTimeLabel();
      updateClock();

      window.setTimeout(() => {
        overlay.classList.add("hidden");
        callback();
      }, 500);
    }
  }, 90);
}

function renderFolders() {
  const folders = ["Inbox", "Sent Items", "Drafts", "Deleted Items"];
  const counts = folderCounts();

  document.getElementById("folders").innerHTML = folders.map((folder) => `
    <button class="folder-btn ${state.activeFolder === folder ? "active" : ""}" data-folder="${escapeHtml(folder)}">
      <span>${escapeHtml(folder)}</span>
      ${
        counts[folder]
          ? `<span class="${counts[folder].unread ? "count unread-count" : "count"}">${
              counts[folder].unread || counts[folder].total
            }</span>`
          : ""
      }
    </button>
  `).join("");

  document.querySelectorAll("[data-folder]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.activeFolder = btn.dataset.folder;
      const first = state.emails.find((email) => email.folder === state.activeFolder);
      state.selectedId = first ? first.id : "";
      state.showCompose = false;
      render();
    });
  });
}

function renderMessageList() {
  const list = filteredEmails();
  const current = selectedEmail();

  document.getElementById("folderTitle").textContent = state.activeFolder;
  document.getElementById("folderTotal").textContent = `${list.length} total`;

  document.getElementById("messageList").innerHTML = list.length
    ? list.map((email) => `
      <button class="message-card ${current?.id === email.id && !state.showCompose ? "active" : ""}" data-email="${escapeHtml(email.id)}">
        <div class="msg-top">
          <div style="min-width:0;">
            <div class="msg-subject-row">
              ${email.unread ? `<span class="unread-dot"></span>` : ""}
              <div class="msg-subject ${email.unread ? "unread-text" : ""}">${escapeHtml(email.subject)}</div>
            </div>
            <div class="msg-sender">${escapeHtml(email.sender)}</div>
          </div>
          <div class="msg-time">${escapeHtml(email.time)}</div>
        </div>
        <div class="msg-snippet">${escapeHtml(email.body[0] || "")}</div>
        <span class="tag">${escapeHtml(email.category)}</span>
      </button>
    `).join("")
    : `<div class="message-card"><span class="msg-sender">No emails found.</span></div>`;

  document.querySelectorAll("[data-email]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.selectedId = btn.dataset.email;

      const email = state.emails.find((item) => item.id === state.selectedId);
      if (email) {
        email.unread = false;
      }

      state.showCompose = false;
      render();
    });
  });
}

function renderEmailPanel() {
  const email = selectedEmail();
  const pane = document.getElementById("readingPane");

  if (!email) {
    pane.innerHTML = `<div class="panel"><div class="panel-body">Select a folder or email.</div></div>`;
    return;
  }

  const body = email.body.map((paragraph) => {
    if (email.code && paragraph.includes(email.code)) {
      return `<p class="code-line">Blackboard code: <strong>${escapeHtml(email.code)}</strong></p>`;
    }

    return `<p>${escapeHtml(paragraph)}</p>`;
  }).join("");

  const attachmentHtml = email.attachments && email.attachments.length
    ? `<div class="attachment-list">${email.attachments.map((name) => `<span class="attachment-chip">📎 ${escapeHtml(name)}</span>`).join("")}</div>`
    : "";

  pane.innerHTML = `
    <article class="panel">
      <div class="panel-head">
        <div style="min-width:0;">
          <h1 class="panel-title">${escapeHtml(email.subject)}</h1>
          <div class="panel-sub">${email.dateGroup === email.time ? escapeHtml(email.dateGroup) : `${escapeHtml(email.dateGroup)} · ${escapeHtml(email.time)}`}</div>
        </div>
        <div class="panel-actions">
          <button id="replyBtn" class="btn btn-primary">↩ Reply</button>
          <button id="starBtn" class="btn">☆</button>
          <button id="deleteBtn" class="btn">🗑</button>
        </div>
      </div>

      <div class="panel-body">
        <div class="sender-row">
          <div class="avatar">${escapeHtml(email.initials)}</div>
          <div style="min-width:0; flex:1;">
            <div><strong>${escapeHtml(email.sender)}</strong> <span class="tiny">to: ${escapeHtml(email.to)}</span></div>
            <div class="email-text">${body}${attachmentHtml}</div>
          </div>
        </div>
      </div>

      <div class="compose-foot">
        <span class="tiny">Training mailbox · ${escapeHtml(state.activeFolder)}</span>
        <span class="tiny">${filteredEmails().length} message${filteredEmails().length === 1 ? "" : "s"}</span>
      </div>
    </article>
  `;

  scrollReadingPaneToTop();

  document.getElementById("replyBtn").addEventListener("click", () => {
    state.compose = {
      to: [],
      subject: email.subject.startsWith("RE:") ? email.subject : `RE: ${email.subject}`,
      body: "",
      attachments: []
    };
    state.showCompose = true;
    state.showPicker = false;
    state.showAttachmentPicker = false;
    render();
  });

  document.getElementById("starBtn").addEventListener("click", () => {
    email.starred = !email.starred;
    render();
  });

  document.getElementById("deleteBtn").addEventListener("click", () => {
    const list = filteredEmails();
    const next = list.find((item) => item.id !== email.id);

    email.folder = "Deleted Items";
    state.selectedId = next ? next.id : "";
    showToast("Email moved to Deleted Items");
    render();
  });
}

function contactChips() {
  if (!state.compose.to.length) {
    return `<span class="tiny">Click here to add recipients</span>`;
  }

  return `
    <div class="chips">
      ${state.compose.to.map((contact) => `
        <span class="chip">${escapeHtml(contact.name)}<small>${escapeHtml(contact.email)}</small></span>
      `).join("")}
    </div>
  `;
}

function recipientsGuideHtml() {
  if (allRequiredRecipientsSelected(state.compose.to)) {
    return "";
  }

  return `
    <div class="guide">
      ℹ️ You need to add Chris Doogan, the PEF / Link Nurse. He should appear if you click here.
      Add him to the email before writing your message.
    </div>
  `;
}

function subjectGuideHtml() {
  if (!allRequiredRecipientsSelected(state.compose.to) || state.compose.subject.trim()) {
    return "";
  }

  return `
    <div class="guide">
      ℹ️ Add a clear subject so the PEF / Link Nurse can quickly see this relates to Victoria
      Hughes-Smith and the needlestick incident.
    </div>
  `;
}

function attachmentChips() {
  if (!state.compose.attachments.length) {
    return `<span class="tiny">Click here to add an attachment</span>`;
  }

  return `
    <div class="chips">
      ${state.compose.attachments.map((name) => `<span class="chip">📎 ${escapeHtml(name)}</span>`).join("")}
    </div>
  `;
}

function attachmentGuideHtml() {
  if (!allRequiredRecipientsSelected(state.compose.to) || !state.compose.subject.trim() || state.compose.attachments.includes("IPform.docx")) {
    return "";
  }

  return `
    <div class="guide">
      ℹ️ Attach the completed IP form before sending the email. Click here and select IPform.docx.
    </div>
  `;
}

function attachmentPickerHtml() {
  if (!state.showAttachmentPicker) {
    return "";
  }

  return `
    <div class="picker attachment-picker">
      <button class="contact" data-attachment="IPform.docx">
        <span>
          <span class="contact-name">IPform.docx</span>
          <span class="contact-role">Completed Incidents in Practice form</span>
        </span>
        <span class="checkbox ${state.compose.attachments.includes("IPform.docx") ? "selected-box" : ""}"></span>
      </button>
    </div>
  `;
}

function bodyGuideHtml() {
  if (!allRequiredRecipientsSelected(state.compose.to) || !state.compose.subject.trim() || !state.compose.attachments.includes("IPform.docx")) {
    return "";
  }

  return `
    <div class="guide bottom">
      ℹ️ Give a brief summary of what happened and explain that the incident report and IP form have
      been completed. The attachment contains the fuller detail, but the email still needs enough context.
    </div>
  `;
}

function pickerHtml() {
  if (!state.showPicker) {
    return "";
  }

  const selected = new Set(state.compose.to.map((contact) => contact.id));

  return `
    <div class="picker">
      ${window.REQUIRED_CONTACTS.map((contact) => `
        <button class="contact ${selected.has(contact.id) ? "selected" : ""}" data-contact="${escapeHtml(contact.id)}">
          <span>
            <span class="contact-name">${escapeHtml(contact.name)}</span>
            <span class="contact-role">${escapeHtml(contact.role)}</span>
            <span class="contact-email">${escapeHtml(contact.email)}</span>
          </span>
          <span class="checkbox"></span>
        </button>
      `).join("")}
    </div>
  `;
}

function renderComposePanel() {
  const pane = document.getElementById("readingPane");

  pane.innerHTML = `
    <section class="panel">
      <div class="panel-head compose-head">
        <div>
          <h1 class="panel-title">New message</h1>
          <div class="panel-sub">Email the PEF / Link Nurse about Victoria Hughes-Smith</div>
        </div>
        <button id="closeCompose" class="btn">✕</button>
      </div>

      <div class="panel-body">
        <div class="form-area">
          <div class="field-shell">
            <label>To</label>
            <button id="toButton" class="to-button" type="button">${contactChips()}</button>
            ${recipientsGuideHtml()}
            ${pickerHtml()}
          </div>

          <div class="field-shell">
            <label>Subject</label>
            <input id="subjectInput" class="input" value="${escapeHtml(state.compose.subject)}" placeholder="Enter subject" />
            ${subjectGuideHtml()}
          </div>

          <div class="field-shell">
            <label>Attachment</label>
            <button id="attachButton" class="to-button" type="button">${attachmentChips()}</button>
            ${attachmentGuideHtml()}
            ${attachmentPickerHtml()}
          </div>

          <div class="field-shell">
            <label>Message</label>
            <textarea id="bodyInput" class="textarea" placeholder="Type the email here...">${escapeHtml(state.compose.body)}</textarea>
            ${bodyGuideHtml()}
          </div>
        </div>
      </div>

      <div class="compose-foot">
        <span class="tiny">Messages stay within this training app.</span>
        <div style="display:flex; gap:8px;">
          <button id="saveDraft" class="btn">Save draft</button>
          <button id="sendMail" class="btn btn-dark">Send</button>
        </div>
      </div>
    </section>
  `;

  document.getElementById("closeCompose").addEventListener("click", () => {
    state.showCompose = false;
    state.showPicker = false;
    state.showAttachmentPicker = false;
    state.compose = { to: [], subject: "", body: "", attachments: [] };
    render();
  });

  document.getElementById("toButton").addEventListener("click", () => {
    state.showPicker = !state.showPicker;
    state.showAttachmentPicker = false;
    render();
  });

  document.querySelectorAll("[data-contact]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const contact = window.REQUIRED_CONTACTS.find((item) => item.id === btn.dataset.contact);
      const exists = state.compose.to.some((item) => item.id === contact.id);

      state.compose.to = exists
        ? state.compose.to.filter((item) => item.id !== contact.id)
        : [...state.compose.to, contact];
      state.showPicker = false;

      render();
    });
  });

  document.getElementById("attachButton").addEventListener("click", () => {
    state.showAttachmentPicker = !state.showAttachmentPicker;
    state.showPicker = false;
    render();
  });

  document.querySelectorAll("[data-attachment]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const attachment = btn.dataset.attachment;
      state.compose.attachments = state.compose.attachments.includes(attachment)
        ? state.compose.attachments.filter((name) => name !== attachment)
        : [attachment];
      state.showAttachmentPicker = false;
      render();
    });
  });

  document.getElementById("subjectInput").addEventListener("input", (event) => {
    state.compose.subject = event.target.value;
  });

  document.getElementById("subjectInput").addEventListener("blur", (event) => {
    state.compose.subject = event.target.value;
    render();
  });

  document.getElementById("bodyInput").addEventListener("input", (event) => {
    state.compose.body = event.target.value;
  });

  document.getElementById("bodyInput").addEventListener("blur", (event) => {
    state.compose.body = event.target.value;
  });

  document.getElementById("saveDraft").addEventListener("click", () => {
    const hasContent = state.compose.to.length || state.compose.subject.trim() || state.compose.body.trim();

    if (!hasContent) {
      showToast("There is nothing to save as a draft yet.");
      return;
    }

    const draft = {
      id: `draft-${Date.now()}`,
      folder: "Drafts",
      sender: "You",
      initials: "Y",
      to: state.compose.to.length ? state.compose.to.map(contactDisplay).join("; ") : "No recipient",
      subject: state.compose.subject.trim() || "No subject",
      dateGroup: "Today",
      time: finalClockTimeLabel(),
      unread: false,
      starred: false,
      category: "Draft",
      body: [state.compose.body.trim() || "No message content"],
      attachments: [...state.compose.attachments]
    };

    state.emails.unshift(draft);
    state.activeFolder = "Drafts";
    state.selectedId = draft.id;
    state.showCompose = false;
    state.showPicker = false;
    state.showAttachmentPicker = false;
    state.compose = { to: [], subject: "", body: "", attachments: [] };
    showToast("Draft saved");
    render();
  });

  document.getElementById("sendMail").addEventListener("click", sendMail);
}

function sendMail() {
  const validationMessage = validateSend(state.compose);

  if (validationMessage) {
    showInstructionModal("More information needed", validationMessage);
    return;
  }

  const sent = {
    id: `sent-${Date.now()}`,
    folder: "Sent Items",
    sender: "You",
    initials: "Y",
    to: state.compose.to.map(contactDisplay).join("; "),
    subject: state.compose.subject.trim(),
    dateGroup: "Today",
    time: finalClockTimeLabel(),
    unread: false,
    starred: false,
    category: "Student task",
    body: [state.compose.body.trim()],
    attachments: [...state.compose.attachments]
  };

  const previousFolder = state.activeFolder;
  const previousSelectedId = state.selectedId;

  state.emails.unshift(sent);
  state.activeFolder = previousFolder;
  state.selectedId = previousSelectedId;
  state.showCompose = false;
  state.showPicker = false;
  state.showAttachmentPicker = false;
  state.compose = { to: [], subject: "", body: "", attachments: [] };

  showToast("Email sent.", 1800);
  render();

  window.clearTimeout(state.replyTimer);
  state.replyTimer = window.setTimeout(() => {
    finalFastForwardClock(25, () => {
      const reply = createPefAcknowledgementReply(sent.subject);

      state.emails.unshift(reply);
      state.activeFolder = previousFolder;
      state.selectedId = previousSelectedId;

      showToast("New unread reply received from Chris Doogan.", 4200);
      render();
    });
  }, 1000);
}

function createPefAcknowledgementReply(subject) {
  return {
    id: `reply-${Date.now()}`,
    folder: "Inbox",
    sender: "Chris Doogan",
    initials: "CD",
    to: "You",
    subject: subject.startsWith("RE:") ? subject : `RE: ${subject}`,
    dateGroup: "Today",
    time: finalClockTimeLabel(),
    unread: true,
    starred: false,
    category: "Reply",
    code: "7429",
    body: [
      "Hello,",
      "Thank you for letting me know and for sending the completed IP form.",
      "I will review the IP form and the actions recorded so far. If further actions are needed, I will add these and liaise with the relevant practice staff to make sure they are followed up.",
      "I will also contact Victoria’s Personal Tutor to let them know what has happened, so the university can offer appropriate support to Victoria following the needlestick injury.",
      "You have completed the correct escalation steps for this activity.",
      "Blackboard code: 7429",
      "You can close this tab now and return to Blackboard.",
      "Kind regards,",
      "Chris Doogan",
      "PEF / Link Nurse"
    ],
    attachments: []
  };
}

function showInstructionModal(title, message) {
  const modal = document.getElementById("instructionModal");
  const titleEl = document.getElementById("instructionTitle");
  const messageEl = document.getElementById("instructionMessage");

  if (!modal || !titleEl || !messageEl) {
    showToast(message, 4500);
    return;
  }

  titleEl.textContent = title;
  messageEl.textContent = message;
  modal.classList.remove("hidden");
}

function closeInstructionModal() {
  const modal = document.getElementById("instructionModal");
  if (modal) {
    modal.classList.add("hidden");
  }
}

function openCompose() {
  state.compose = { to: [], subject: "", body: "", attachments: [] };
  state.showCompose = true;
  state.showPicker = false;
  state.showAttachmentPicker = false;
  render();
}

function render() {
  renderFolders();
  renderMessageList();

  if (state.showCompose) {
    renderComposePanel();
  } else {
    renderEmailPanel();
  }
}

function updateClock() {
  document.getElementById("clock").innerHTML = `${finalClockTimeLabel()}<br>${finalClockDateLabel()}`;
}

document.getElementById("introClose").addEventListener("click", () => {
  document.getElementById("introModal").classList.add("hidden");
});

document.getElementById("instructionClose").addEventListener("click", closeInstructionModal);

document.getElementById("topNewMail").addEventListener("click", openCompose);
document.getElementById("sideNewMail").addEventListener("click", openCompose);

document.getElementById("searchInput").addEventListener("input", (event) => {
  state.query = event.target.value;
  render();
});

updateClock();
setInterval(updateClock, 30000);

console.assert(window.INITIAL_EMAILS.every((email) => email.unread === false), "Initial mailbox should not contain unread emails.");
console.assert(window.INITIAL_EMAILS[0].id === "final-becca-luke-escalation-reply", "Continuity Becca reply should appear first.");
console.assert(window.REQUIRED_CONTACTS.length === 1, "Only the PEF / Link Nurse should be required for this task.");
console.assert(window.REQUIRED_CONTACTS[0].email === "chris.doogan@salford.example", "PEF contact should be Chris Doogan.");
console.assert(createPefAcknowledgementReply("Test").unread === true, "Chris reply should arrive unread.");
console.assert(createPefAcknowledgementReply("Test").code === "7429", "Chris reply should include Blackboard code.");
console.assert(folderCounts().Inbox.total >= 9, "Inbox should include continuity emails and the final Becca reply.");
render();

console.assert(typeof finalFastForwardClock === "function", "Clock fast-forward is present.");
console.assert(validateSend({ to: [...window.REQUIRED_CONTACTS], subject: "Victoria IP form", body: "short message", attachments: ["IPform.docx"] }).includes("slightly more detail"), "Brief body should trigger detail validation.");
