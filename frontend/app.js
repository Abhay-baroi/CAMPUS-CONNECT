(() => {
  "use strict";

  // ============================================================
  // Configuration & Smart API Base Resolution
  // ============================================================
  // Smart API Base: In production (Vercel, custom domain), use origin or relative path.
  // In local development, if on port 8000 use origin/relative; if on another port (e.g. 5500), use localhost:8000.
  const isLocalhost = Boolean(
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "[::1]"
  );

  const API_BASE = (window.CAMPUSCONNECT_API_BASE || 
    (!isLocalhost 
      ? (window.location.origin || "") 
      : (window.location.port === "8000" ? (window.location.origin || "") : "http://127.0.0.1:8000"))
  ).replace(/\/+$/, "");

  const TEST_STUDENT_ID = "22222222-2222-2222-2222-222222222222";
  const FALLBACK_COVER = "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80";

  // ============================================================
  // Application Reactive State
  // ============================================================
  const state = {
    events: [],
    registrations: [],
    activeCategory: "all",
    search: "",
    route: { page: "events", id: null },
    loadingEvents: false,
    loadingRegistrations: false,
    loadingDetail: false,
    detailEvent: null,
    registering: false,
    detailError: "",
    lastRegistered: null,
    registrationTab: "upcoming",
    activeTicket: null,
    backendOnline: false
  };

  // DOM Elements
  const appRoot = document.getElementById("app-root");
  const toastContainer = document.getElementById("toast");
  const navEvents = document.getElementById("nav-events");
  const navRegistrations = document.getElementById("nav-registrations");
  const navRegBadge = document.getElementById("nav-reg-badge");
  const mobileRegBadge = document.getElementById("mobile-reg-badge");
  const mobileMenu = document.getElementById("mobile-menu");
  const mobileMenuBtn = document.getElementById("mobile-menu-btn");
  const ticketModal = document.getElementById("ticket-modal");
  const closeTicketModalBtn = document.getElementById("close-ticket-modal");
  const downloadPassBtn = document.getElementById("download-pass-btn");
  const calendarPassBtn = document.getElementById("calendar-pass-btn");
  const backendStatusText = document.getElementById("backend-status-text");

  // ============================================================
  // Utility Functions
  // ============================================================
  function escapeHTML(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatDate(isoStr, fallback = "Date TBA") {
    if (!isoStr) return fallback;
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return fallback;
      return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(d);
    } catch {
      return fallback;
    }
  }

  function formatTime(isoStr, fallback = "Time TBA") {
    if (!isoStr) return fallback;
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return fallback;
      return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).format(d);
    } catch {
      return fallback;
    }
  }

  function isUserRegistered(eventId) {
    return state.registrations.some(r => {
      const rEventId = r.event_id || (r.events && r.events.id);
      return String(rEventId) === String(eventId);
    });
  }

  function getUserRegistration(eventId) {
    return state.registrations.find(r => {
      const rEventId = r.event_id || (r.events && r.events.id);
      return String(rEventId) === String(eventId);
    });
  }

  function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast-item ${type}`;
    const icon = type === "success" ? "check_circle" : type === "error" ? "error" : "info";
    toast.innerHTML = `
      <span class="material-symbols-outlined text-[20px]">${icon}</span>
      <span>${escapeHTML(message)}</span>
    `;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(10px)";
      setTimeout(() => toast.remove(), 250);
    }, 3500);
  }

  // ============================================================
  // Network / API Client
  // ============================================================
  async function apiRequest(path, options = {}) {
    const url = `${API_BASE}/api${path}`;
    const headers = {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "x-user-id": TEST_STUDENT_ID,
      ...options.headers
    };

    try {
      const response = await fetch(url, { ...options, headers });
      state.backendOnline = response.ok || response.status === 409 || response.status === 404;
      updateBackendStatus(state.backendOnline);

      let payload = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (!response.ok) {
        const errorDetail = payload?.detail || `Server error (${response.status})`;
        throw new Error(errorDetail);
      }

      return payload;
    } catch (err) {
      if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
        state.backendOnline = false;
        updateBackendStatus(false);
        throw new Error("Unable to connect to CampusConnect backend. Please make sure the backend server is running on port 8000.");
      }
      throw err;
    }
  }

  function updateBackendStatus(isOnline) {
    if (backendStatusText) {
      backendStatusText.textContent = isOnline ? "Live Sync" : "Connecting...";
    }
  }

  // ============================================================
  // Data Fetching Operations
  // ============================================================
  async function fetchEvents() {
    state.loadingEvents = true;
    try {
      const data = await apiRequest("/events");
      state.events = Array.isArray(data) ? data : [];
    } catch (err) {
      console.error("Error fetching events:", err);
      showToast(err.message, "error");
    } finally {
      state.loadingEvents = false;
      renderCurrentRoute();
    }
  }

  async function fetchRegistrations() {
    state.loadingRegistrations = true;
    try {
      const data = await apiRequest("/me/registrations");
      state.registrations = Array.isArray(data) ? data : [];
      updateRegistrationBadges();
    } catch (err) {
      console.error("Error fetching registrations:", err);
    } finally {
      state.loadingRegistrations = false;
      if (state.route.page === "registrations") {
        renderCurrentRoute();
      }
    }
  }

  async function fetchEventDetail(eventId) {
    state.loadingDetail = true;
    state.detailError = "";
    state.detailEvent = null;
    renderCurrentRoute();

    try {
      const data = await apiRequest(`/events/${encodeURIComponent(eventId)}`);
      state.detailEvent = data;
    } catch (err) {
      state.detailError = err.message;
      showToast(err.message, "error");
    } finally {
      state.loadingDetail = false;
      renderCurrentRoute();
    }
  }

  function updateRegistrationBadges() {
    const count = state.registrations.length;
    if (navRegBadge) {
      navRegBadge.textContent = count;
      navRegBadge.classList.toggle("hidden", count === 0);
    }
    if (mobileRegBadge) {
      mobileRegBadge.textContent = count;
      mobileRegBadge.classList.toggle("hidden", count === 0);
    }
  }

  // ============================================================
  // Core Business Actions (Registration & Cancellation)
  // ============================================================
  async function registerForEvent(event) {
    if (!event || state.registering) return;
    state.registering = true;
    state.detailError = "";
    renderCurrentRoute();

    try {
      const result = await apiRequest("/registrations", {
        method: "POST",
        body: JSON.stringify({ event_id: event.id })
      });

      // Save for celebration banner
      state.lastRegistered = {
        id: result.id,
        event: event,
        timestamp: new Date()
      };

      // Refresh registrations and events to sync capacity
      await fetchRegistrations();
      await fetchEvents();

      showToast(`Success! You're registered for ${event.title}`, "success");
      window.location.hash = "#/registrations";
    } catch (err) {
      state.detailError = err.message === "DUPLICATE_REGISTRATION"
        ? "You have already registered for this event."
        : err.message === "EVENT_FULL"
        ? "This event is currently full. No more seats available."
        : err.message;
      showToast(state.detailError, "error");
    } finally {
      state.registering = false;
      renderCurrentRoute();
    }
  }

  async function cancelRegistration(registrationId, eventTitle = "the event") {
    if (!confirm(`Are you sure you want to cancel your registration for ${eventTitle}? Your seat will be released.`)) {
      return;
    }

    try {
      await apiRequest(`/registrations/${encodeURIComponent(registrationId)}`, {
        method: "DELETE"
      });

      showToast(`Registration for ${eventTitle} has been cancelled.`, "info");
      await fetchRegistrations();
      await fetchEvents();

      if (state.detailEvent && (state.detailEvent.id === registrationId || getUserRegistration(state.detailEvent.id)?.id === registrationId)) {
        await fetchEventDetail(state.detailEvent.id);
      }
      renderCurrentRoute();
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  // ============================================================
  // Interactive Ticket & Calendar Generation
  // ============================================================
  function openTicketModal(event, registration = null) {
    if (!event) return;
    state.activeTicket = { event, registration };

    const modalTitle = document.getElementById("ticket-event-title");
    const modalDateTime = document.getElementById("ticket-datetime");
    const modalLocation = document.getElementById("ticket-location");
    const modalId = document.getElementById("ticket-id");

    if (modalTitle) modalTitle.textContent = event.title || "Campus Event";
    if (modalDateTime) {
      const dateText = event.date_str || formatDate(event.starts_at);
      const timeText = event.time_str || formatTime(event.starts_at);
      modalDateTime.textContent = `${dateText} • ${timeText}`;
    }
    if (modalLocation) modalLocation.textContent = event.location || "Main Campus Hall";
    if (modalId) {
      const regId = registration?.id || event.id || "CAMPUS-PASS";
      modalId.textContent = `PASS-${String(regId).slice(0, 8).toUpperCase()}`;
    }

    ticketModal.classList.remove("hidden");
  }

  function closeTicketModal() {
    ticketModal.classList.add("hidden");
    state.activeTicket = null;
  }

  function downloadCalendarICS(event) {
    if (!event) return;
    const title = event.title || "CampusConnect Event";
    const desc = (event.description || "").replace(/\n/g, " ");
    const location = event.location || "Campus Hall";
    
    // Format timestamp in UTC ICS format (YYYYMMDDTHHMMSSZ)
    const startDate = event.starts_at ? new Date(event.starts_at) : new Date(Date.now() + 86400000);
    const endDate = event.ends_at ? new Date(event.ends_at) : new Date(startDate.getTime() + 7200000);
    
    const formatICSDate = (d) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    
    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//CampusConnect//Event Platform//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `SUMMARY:${title}`,
      `DESCRIPTION:${desc}`,
      `LOCATION:${location}`,
      `DTSTART:${formatICSDate(startDate)}`,
      `DTEND:${formatICSDate(endDate)}`,
      `STATUS:CONFIRMED`,
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, "_")}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast("Calendar invite downloaded (.ics)", "success");
  }

  function downloadTicketPass() {
    if (!state.activeTicket) return;
    const { event, registration } = state.activeTicket;
    const regId = registration?.id || event.id || "PASS";
    const passText = `
========================================
CAMPUSCONNECT OFFICIAL DIGITAL PASS
========================================
Event: ${event.title}
Category: ${event.category || "Campus Activity"}
Date: ${event.date_str || formatDate(event.starts_at)}
Time: ${event.time_str || formatTime(event.starts_at)}
Location: ${event.location || "Main Campus"}
Room / Hall: ${event.room || "Check with organizer"}

Attendee: Alex Chen (Student 1)
Email: student1@campus.edu
Pass ID: ${regId}
Status: VERIFIED & CONFIRMED
========================================
Present this pass with Student ID upon entry.
========================================
`;
    const blob = new Blob([passText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `CampusPass_${event.title.replace(/[^a-zA-Z0-9]/g, "_")}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast("Pass saved to your downloads", "success");
  }

  // ============================================================
  // View 1: Explore Events Catalog Component
  // ============================================================
  function renderExploreCatalog() {
    const categories = ["all", "ai", "robotics", "open source", "design", "web3"];
    const query = state.search.trim().toLowerCase();

    const filteredEvents = state.events.filter(event => {
      const categoryMatch = state.activeCategory === "all" || 
        (event.category && event.category.toLowerCase().includes(state.activeCategory));
      
      const textMatch = !query || [
        event.title,
        event.category,
        event.location,
        event.description,
        event.organizer_name
      ].some(val => val && val.toLowerCase().includes(query));

      return categoryMatch && textMatch;
    });

    const eventsHtml = filteredEvents.map(event => {
      const seatsLeft = Number.isFinite(event.seats_left) ? event.seats_left : (event.capacity || 50);
      const isFull = seatsLeft <= 0 || event.status !== "open";
      const isRegistered = isUserRegistered(event.id);
      const dateText = event.date_str || formatDate(event.starts_at);
      const timeText = event.time_str || formatTime(event.starts_at);
      const category = event.category || "Tech";
      const imageUrl = event.image_url || FALLBACK_COVER;
      const organizer = event.organizer_name || "Campus Society";

      // Color coding for seats indicator
      let seatBadgeClass = "bg-surface-container text-on-surface-variant";
      let pingColor = "bg-secondary";
      if (seatsLeft <= 5 && !isFull) {
        seatBadgeClass = "bg-error-container text-on-error-container font-bold";
        pingColor = "bg-tertiary";
      } else if (seatsLeft <= 15 && !isFull) {
        seatBadgeClass = "bg-surface-container-high text-on-surface font-semibold";
        pingColor = "bg-primary";
      }

      return `
        <div class="event-card group bg-surface-container-lowest rounded-2xl shadow-sm hover:shadow-xl border border-surface-variant/80 flex flex-col overflow-hidden" data-category="${escapeHTML(category.toLowerCase())}">
          
          <!-- Thumbnail & Badges Container -->
          <div class="relative w-full h-48 overflow-hidden bg-surface-container event-card-img-wrap">
            <img class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                 src="${escapeHTML(imageUrl)}" 
                 alt="${escapeHTML(event.title)}" 
                 loading="lazy" />
            
            <div class="absolute inset-0 bg-gradient-to-t from-on-background/85 via-on-background/20 to-transparent"></div>
            
            <!-- Category & Featured Badges -->
            <div class="absolute top-3 left-3 flex items-center gap-2">
              <span class="px-2.5 py-1 rounded-md bg-surface-container-lowest/90 backdrop-blur-md text-xs font-bold text-primary shadow-sm">
                ${escapeHTML(category)}
              </span>
              ${event.featured ? `
                <span class="px-2.5 py-1 rounded-md bg-primary-container text-white text-[10px] font-bold uppercase tracking-wider shadow-sm">
                  Featured
                </span>` : ""}
            </div>

            <!-- Department / Organizer Tag -->
            <div class="absolute bottom-3 left-3 text-white flex items-center gap-1.5 text-xs font-medium drop-shadow-sm">
              <span class="material-symbols-outlined text-[16px] text-secondary-container">school</span>
              <span>${escapeHTML(organizer)}</span>
            </div>

            ${isRegistered ? `
              <div class="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-secondary text-white text-xs font-bold flex items-center gap-1 shadow-md">
                <span class="material-symbols-outlined text-[14px]">check</span> Registered
              </div>
            ` : ""}
          </div>

          <!-- Card Content Body -->
          <div class="p-5 flex-1 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between gap-2 mb-2">
                <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs ${seatBadgeClass}">
                  <span class="w-2 h-2 rounded-full ${pingColor} ${seatsLeft <= 10 && !isFull ? "radar-ping" : ""}"></span>
                  ${isFull ? "Closed / Full" : `${seatsLeft} seats left`}
                </span>
                <span class="text-xs font-bold text-secondary">${escapeHTML(event.admission_tier || "Free RSVP")}</span>
              </div>

              <h2 class="text-lg font-bold text-on-surface group-hover:text-primary transition-colors leading-snug line-clamp-2">
                <a href="#/events/${encodeURIComponent(event.id)}">${escapeHTML(event.title)}</a>
              </h2>

              <p class="mt-2 text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
                ${escapeHTML(event.description || "Join fellow students for an immersive workshop and hands-on project sprint.")}
              </p>

              <!-- Schedule & Venue Meta -->
              <div class="mt-4 space-y-1.5 text-xs text-on-surface-variant">
                <div class="flex items-center gap-2">
                  <span class="material-symbols-outlined text-[18px] text-primary">calendar_today</span>
                  <span class="font-medium text-on-surface">${escapeHTML(dateText)} • ${escapeHTML(timeText)}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="material-symbols-outlined text-[18px] text-outline">location_on</span>
                  <span class="truncate">${escapeHTML(event.location || "Campus Hall")}</span>
                </div>
              </div>
            </div>

            <!-- Card Bottom Bar: Attendees + Action -->
            <div class="pt-4 mt-4 border-t border-surface-container flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div class="flex avatar-stack">
                  <span class="inline-block h-6 w-6 rounded-full bg-primary-fixed text-on-primary-fixed text-center text-[10px] font-bold leading-6">JD</span>
                  <span class="inline-block h-6 w-6 rounded-full bg-secondary-fixed text-on-secondary-fixed text-center text-[10px] font-bold leading-6">RK</span>
                  <span class="inline-block h-6 w-6 rounded-full bg-surface-container-high text-on-surface text-center text-[10px] font-bold leading-6">+42</span>
                </div>
              </div>

              <a href="#/events/${encodeURIComponent(event.id)}" 
                 class="h-9 px-4 rounded-lg bg-primary-container hover:bg-primary text-white font-semibold text-xs flex items-center gap-1 transition-all active:scale-95 shadow-sm">
                <span>View Details</span>
                <span class="material-symbols-outlined text-[16px] group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
              </a>
            </div>

          </div>
        </div>
      `;
    }).join("");

    return `
      <!-- Ambient Glow Accents -->
      <div class="relative w-full overflow-hidden">
        <div class="absolute -top-32 -left-32 w-96 h-96 bg-primary-container/10 rounded-full blur-3xl pointer-events-none ambient-glow-1"></div>
        <div class="absolute top-24 right-0 w-80 h-80 bg-secondary-container/20 rounded-full blur-3xl pointer-events-none ambient-glow-2"></div>
      </div>

      <div class="max-w-7xl mx-auto px-4 sm:px-6">
        
        <!-- Hero Section & Campus Pulse Metrics -->
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 pt-2">
          <div class="max-w-2xl">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container text-primary text-xs font-semibold mb-3 shadow-sm border border-surface-variant">
              <span class="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              Spring Semester 2025
            </div>
            <h1 class="text-3xl sm:text-4xl lg:text-5xl font-black text-on-surface tracking-tight leading-tight">
              Find your next <br class="hidden sm:inline"/>campus experience.
            </h1>
            <p class="text-base text-on-surface-variant mt-2 max-w-xl">
              Discover hackathons, AI workshops, robotics build nights, and career networking across campus societies.
            </p>
          </div>

          <!-- Dynamic Campus Pulse Spark Card -->
          <div class="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-surface-variant/80 flex items-center gap-4 min-w-[280px]">
            <div class="w-12 h-12 rounded-xl bg-gradient-to-tr from-primary to-primary-container flex items-center justify-center text-white shadow-md shadow-primary/20">
              <span class="material-symbols-outlined text-[26px]">electric_bolt</span>
            </div>
            <div class="flex-1">
              <div class="flex items-center justify-between text-on-surface text-sm font-bold">
                <span>Campus Pulse</span>
                <span class="text-secondary font-bold">94% Active</span>
              </div>
              <div class="w-full bg-surface-variant h-2 rounded-full mt-2 overflow-hidden">
                <div class="bg-primary-container h-full rounded-full transition-all duration-1000" style="width: 88%"></div>
              </div>
              <span class="text-[11px] text-on-surface-variant mt-1.5 block">${state.events.length} Live Activities Scheduled</span>
            </div>
          </div>
        </div>

        <!-- Search & Category Filters Rail -->
        <div class="bg-surface-container-lowest p-4 rounded-2xl shadow-sm border border-surface-variant/80 mb-8 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          
          <!-- Live Search Bar -->
          <div class="relative flex-1 max-w-lg">
            <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline">
              <span class="material-symbols-outlined text-[20px]">search</span>
            </div>
            <input id="event-search-input" 
                   type="text" 
                   value="${escapeHTML(state.search)}" 
                   placeholder="Search workshops, AI, robotics, venues..." 
                   class="w-full h-11 pl-10 pr-9 bg-surface-container-low text-on-surface placeholder:text-outline text-sm rounded-xl focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary transition-all border border-transparent focus:border-primary" />
            ${state.search ? `
              <button id="clear-search-btn" class="absolute inset-y-0 right-0 pr-3 flex items-center text-outline hover:text-on-surface">
                <span class="material-symbols-outlined text-[18px]">close</span>
              </button>
            ` : ""}
          </div>

          <!-- Category Chips Rail -->
          <div class="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0" id="filter-chip-group">
            ${categories.map(cat => {
              const active = state.activeCategory === cat;
              const label = cat === "all" ? "All Events" : cat.toUpperCase();
              return `
                <button class="filter-chip px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${active ? "active border-primary-container" : "bg-surface-container-low text-on-surface-variant border-surface-variant hover:bg-surface-container hover:text-on-surface"}"
                        data-category="${escapeHTML(cat)}">
                  ${escapeHTML(label)}
                </button>
              `;
            }).join("")}
          </div>
        </div>

        <!-- Events Grid / Skeletons / Empty State -->
        ${state.loadingEvents ? `
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            ${[1, 2, 3, 4, 5, 6].map(() => `
              <div class="bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-surface-variant space-y-3">
                <div class="w-full h-44 rounded-xl skeleton-shimmer"></div>
                <div class="w-1/3 h-5 rounded-md skeleton-shimmer"></div>
                <div class="w-3/4 h-6 rounded-md skeleton-shimmer"></div>
                <div class="w-full h-4 rounded-md skeleton-shimmer"></div>
              </div>
            `).join("")}
          </div>
        ` : filteredEvents.length ? `
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="event-catalog-grid">
            ${eventsHtml}
          </div>
        ` : `
          <div class="bg-surface-container-lowest rounded-2xl p-12 text-center border border-surface-variant max-w-lg mx-auto">
            <div class="w-16 h-16 rounded-full bg-surface-container mx-auto flex items-center justify-center text-outline mb-4">
              <span class="material-symbols-outlined text-[32px]">search_off</span>
            </div>
            <h3 class="text-lg font-bold text-on-surface">No matching events found</h3>
            <p class="text-sm text-on-surface-variant mt-1 mb-6">Try searching for other topics or reset your category filter.</p>
            <button id="reset-filters-btn" class="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-container transition-all shadow-sm">
              Reset Filters
            </button>
          </div>
        `}

        <!-- Proposal / Host Banner -->
        <div class="mt-12 bg-gradient-to-r from-surface-container-low to-surface-container-high rounded-2xl p-6 border border-surface-variant/80 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-surface-container-lowest flex items-center justify-center text-primary shadow-sm shrink-0">
              <span class="material-symbols-outlined text-[24px]">campaign</span>
            </div>
            <div>
              <h4 class="font-bold text-sm text-on-surface">Organizing an event or club project demo?</h4>
              <p class="text-xs text-on-surface-variant">Host a workshop on CampusConnect and connect with 5,000+ verified campus students.</p>
            </div>
          </div>
          <button onclick="alert('CampusConnect Organizer Portal is active. Contact coordinator@campus.edu to list an official event.')" 
                  class="px-4 py-2 rounded-lg bg-surface-container-lowest text-on-surface text-xs font-semibold hover:bg-surface border border-surface-variant transition-all shrink-0">
            Submit Event Proposal →
          </button>
        </div>

      </div>
    `;
  }

  // ============================================================
  // View 2: Event Details Component
  // ============================================================
  function renderEventDetailView() {
    if (state.loadingDetail) {
      return `
        <div class="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <div class="w-48 h-6 rounded-md skeleton-shimmer mb-6"></div>
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div class="lg:col-span-8 space-y-4">
              <div class="w-full h-80 rounded-2xl skeleton-shimmer"></div>
              <div class="w-3/4 h-8 rounded-md skeleton-shimmer"></div>
              <div class="w-full h-24 rounded-md skeleton-shimmer"></div>
            </div>
            <div class="lg:col-span-4">
              <div class="w-full h-96 rounded-2xl skeleton-shimmer"></div>
            </div>
          </div>
        </div>
      `;
    }

    const event = state.detailEvent;
    if (!event) {
      return `
        <div class="max-w-md mx-auto px-4 py-16 text-center">
          <div class="w-16 h-16 rounded-full bg-error-container text-on-error-container mx-auto flex items-center justify-center mb-4">
            <span class="material-symbols-outlined text-[32px]">event_busy</span>
          </div>
          <h2 class="text-xl font-bold text-on-surface">Event not found</h2>
          <p class="text-sm text-on-surface-variant mt-2 mb-6">${escapeHTML(state.detailError || "This event may have been unlisted or moved.")}</p>
          <a href="#/events" class="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold shadow-sm">
            <span class="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Back to Catalog</span>
          </a>
        </div>
      `;
    }

    const capacity = Number(event.capacity || 50);
    const booked = Number(event.booked_seats || 0);
    const seatsLeft = Number.isFinite(event.seats_left) ? event.seats_left : Math.max(0, capacity - booked);
    const isFull = seatsLeft <= 0 || event.status !== "open";
    const isRegistered = isUserRegistered(event.id);
    const userReg = getUserRegistration(event.id);
    const dateText = event.date_str || formatDate(event.starts_at);
    const timeText = event.time_str || formatTime(event.starts_at);
    const category = event.category || "Campus";
    const imageUrl = event.image_url || FALLBACK_COVER;
    const perks = event.perks || [
      { icon: "local_pizza", title: "Free Refreshments", desc: "Artisan snacks and drinks provided." },
      { icon: "card_membership", title: "Certificate of Attendance", desc: "Verified digital credential for your resume." },
      { icon: "support_agent", title: "Mentorship", desc: "Direct hands-on guidance from faculty." }
    ];

    const capacityPercent = Math.min(100, Math.round(((capacity - seatsLeft) / capacity) * 100));

    return `
      <div class="max-w-6xl mx-auto px-4 sm:px-6">
        
        <!-- Breadcrumbs Navigation -->
        <nav class="flex items-center gap-2 text-xs font-medium text-on-surface-variant py-3" aria-label="Breadcrumb">
          <a href="#/events" class="hover:text-primary transition-colors flex items-center gap-1">
            <span class="material-symbols-outlined text-[16px]">arrow_back</span> Explore Events
          </a>
          <span>›</span>
          <span class="text-on-surface font-semibold truncate max-w-xs">${escapeHTML(event.title)}</span>
        </nav>

        <!-- Header Overview Block -->
        <div class="bg-surface-container-lowest rounded-2xl p-6 sm:p-8 shadow-sm border border-surface-variant/80 mb-8">
          <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div class="flex items-center gap-2">
              <span class="px-3 py-1 rounded-full bg-primary-container/10 text-primary font-bold text-xs">
                ${escapeHTML(category)}
              </span>
              <span class="px-3 py-1 rounded-full ${isFull ? "bg-surface-variant text-on-surface-variant" : "bg-secondary-container text-on-secondary-container"} font-bold text-xs">
                ${isFull ? "Closed" : "RSVP Open"}
              </span>
            </div>
            <div class="text-xs text-on-surface-variant flex items-center gap-1">
              <span class="material-symbols-outlined text-[16px] text-primary">verified</span>
              <span>Hosted by <strong class="text-on-surface">${escapeHTML(event.organizer_name || "Campus Society")}</strong></span>
            </div>
          </div>

          <h1 class="text-2xl sm:text-3xl lg:text-4xl font-black text-on-surface tracking-tight leading-snug">
            ${escapeHTML(event.title)}
          </h1>

          <!-- Quick Fact Badges Strip -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-surface-container">
            <div class="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low">
              <div class="w-10 h-10 rounded-lg bg-surface-container-lowest flex items-center justify-center text-primary shadow-sm shrink-0">
                <span class="material-symbols-outlined text-[20px]">calendar_today</span>
              </div>
              <div class="min-w-0">
                <span class="block text-[11px] text-on-surface-variant">Date</span>
                <span class="font-bold text-xs text-on-surface truncate block">${escapeHTML(dateText)}</span>
              </div>
            </div>

            <div class="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low">
              <div class="w-10 h-10 rounded-lg bg-surface-container-lowest flex items-center justify-center text-primary shadow-sm shrink-0">
                <span class="material-symbols-outlined text-[20px]">schedule</span>
              </div>
              <div class="min-w-0">
                <span class="block text-[11px] text-on-surface-variant">Time</span>
                <span class="font-bold text-xs text-on-surface truncate block">${escapeHTML(timeText)}</span>
              </div>
            </div>

            <div class="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low">
              <div class="w-10 h-10 rounded-lg bg-surface-container-lowest flex items-center justify-center text-primary shadow-sm shrink-0">
                <span class="material-symbols-outlined text-[20px]">location_on</span>
              </div>
              <div class="min-w-0">
                <span class="block text-[11px] text-on-surface-variant">Location</span>
                <span class="font-bold text-xs text-on-surface truncate block">${escapeHTML(event.location || "Campus Hall")}</span>
              </div>
            </div>

            <div class="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low">
              <div class="w-10 h-10 rounded-lg bg-surface-container-lowest flex items-center justify-center text-tertiary shadow-sm shrink-0">
                <span class="material-symbols-outlined text-[20px]">airline_seat_recline_extra</span>
              </div>
              <div class="min-w-0">
                <span class="block text-[11px] text-on-surface-variant">Availability</span>
                <span class="font-bold text-xs text-tertiary truncate block">${isFull ? "Sold Out" : `${seatsLeft} seats left`}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Main Two-Column Layout -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          <!-- Left Column: Media, About, Perks -->
          <div class="lg:col-span-8 space-y-6">
            
            <!-- Showcase Image Card -->
            <div class="rounded-2xl overflow-hidden bg-surface-container-lowest shadow-sm border border-surface-variant/80 p-2">
              <div class="relative w-full h-80 sm:h-96 rounded-xl overflow-hidden">
                <img class="w-full h-full object-cover" src="${escapeHTML(imageUrl)}" alt="${escapeHTML(event.title)}" />
                <div class="absolute inset-0 bg-gradient-to-t from-inverse-surface/85 via-transparent to-transparent flex items-end p-5">
                  <div class="flex items-center gap-2 text-inverse-on-surface text-xs font-semibold">
                    <span class="material-symbols-outlined text-secondary-fixed text-[18px]">verified_user</span>
                    <span>Student RSVP Verified • Badge & Materials Provided</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Description Block -->
            <div class="rounded-2xl bg-surface-container-lowest p-6 sm:p-8 shadow-sm border border-surface-variant/80">
              <h2 class="text-xl font-bold text-on-surface mb-3 flex items-center gap-2">
                <span class="material-symbols-outlined text-primary text-[24px]">description</span>
                <span>About this Workshop</span>
              </h2>
              <div class="text-sm text-on-surface-variant leading-relaxed space-y-3">
                <p>${escapeHTML(event.description || "Join fellow students for this immersive campus experience.")}</p>
              </div>

              <!-- Perks Grid -->
              <h3 class="text-base font-bold text-on-surface mt-8 mb-4">What's Included</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                ${perks.map(perk => `
                  <div class="flex items-start gap-3 p-3.5 rounded-xl bg-surface-container-low border border-surface-variant/50">
                    <div class="w-9 h-9 rounded-lg bg-surface-container-lowest flex items-center justify-center text-primary shrink-0 shadow-sm">
                      <span class="material-symbols-outlined text-[20px]">${escapeHTML(perk.icon || "star")}</span>
                    </div>
                    <div>
                      <h4 class="font-bold text-xs text-on-surface">${escapeHTML(perk.title)}</h4>
                      <p class="text-[11px] text-on-surface-variant mt-0.5">${escapeHTML(perk.desc)}</p>
                    </div>
                  </div>
                `).join("")}
              </div>
            </div>

          </div>

          <!-- Right Column: Interactive Sticky RSVP Card -->
          <div class="lg:col-span-4 sticky top-24 space-y-6">
            
            <div class="rounded-2xl bg-surface-container-lowest p-6 shadow-xl border border-surface-variant/90 relative overflow-hidden">
              <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary to-primary-container"></div>
              
              <!-- Admission & Price -->
              <div class="flex items-center justify-between pb-4 border-b border-surface-container">
                <div>
                  <span class="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider block">Admission</span>
                  <span class="text-sm font-bold text-on-surface">${escapeHTML(event.admission_tier || "Student RSVP")}</span>
                </div>
                <span class="px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container font-black text-sm">
                  ${escapeHTML(event.price || "FREE")}
                </span>
              </div>

              <!-- Seat Gauge Progress -->
              <div class="py-4 space-y-2">
                <div class="flex justify-between text-xs font-semibold">
                  <span class="text-on-surface-variant">Capacity Status</span>
                  <span class="${isFull ? "text-error" : "text-primary"}">${capacity - seatsLeft} / ${capacity} Booked</span>
                </div>
                <div class="w-full h-2 rounded-full bg-surface-container overflow-hidden">
                  <div class="h-full rounded-full ${isFull ? "bg-error" : "bg-primary-container"} transition-all duration-700" 
                       style="width: ${capacityPercent}%"></div>
                </div>
                <p class="text-[11px] text-on-surface-variant">
                  ${isFull ? "Registration is currently full." : `Hurry! Only ${seatsLeft} seat${seatsLeft === 1 ? "" : "s"} remain open.`}
                </p>
              </div>

              <!-- User Registration State & CTA -->
              <div class="mt-4 pt-4 border-t border-surface-container">
                ${isRegistered ? `
                  <div class="p-3.5 rounded-xl bg-secondary-container/40 border border-secondary/30 mb-3 text-center">
                    <div class="flex items-center justify-center gap-1.5 text-secondary font-bold text-xs mb-1">
                      <span class="material-symbols-outlined text-[18px]">check_circle</span>
                      <span>You're Registered!</span>
                    </div>
                    <p class="text-[11px] text-on-surface-variant">Your seat is guaranteed under student1@campus.edu</p>
                  </div>

                  <div class="flex flex-col gap-2">
                    <button id="view-ticket-btn" class="w-full h-11 rounded-xl bg-primary text-white font-bold text-sm shadow-md hover:bg-primary-container transition-all flex items-center justify-center gap-1.5 active:scale-95">
                      <span class="material-symbols-outlined text-[18px]">qr_code</span>
                      <span>View My Ticket Pass</span>
                    </button>
                    <button id="cancel-rsvp-btn" class="w-full h-9 rounded-xl text-error hover:bg-error-container/20 font-semibold text-xs transition-colors">
                      Cancel Registration
                    </button>
                  </div>
                ` : `
                  <button id="register-btn" 
                          ${isFull || state.registering ? "disabled" : ""} 
                          class="w-full h-12 rounded-xl bg-primary hover:bg-primary-container disabled:bg-surface-variant disabled:text-outline text-white font-bold text-sm shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2 active:scale-95">
                    ${state.registering ? `
                      <span class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Reserving Seat...</span>
                    ` : isFull ? `
                      <span>Event Full / Sold Out</span>
                    ` : `
                      <span>Register for Event</span>
                      <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
                    `}
                  </button>
                `}

                ${state.detailError ? `
                  <div class="mt-3 p-3 rounded-lg bg-error-container text-on-error-container text-xs font-medium flex items-center gap-2">
                    <span class="material-symbols-outlined text-[16px] shrink-0">warning</span>
                    <span>${escapeHTML(state.detailError)}</span>
                  </div>
                ` : ""}

                <div class="mt-4 text-center">
                  <span class="text-[11px] text-outline">Direct sync with university authentication portal</span>
                </div>
              </div>

            </div>

            <!-- Host Card -->
            <div class="rounded-2xl bg-surface-container-lowest p-5 border border-surface-variant flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-bold text-sm shadow-sm">
                ${escapeHTML((event.organizer_name || "CS").slice(0, 2).toUpperCase())}
              </div>
              <div class="min-w-0">
                <span class="font-bold text-xs text-on-surface block truncate">${escapeHTML(event.organizer_name || "Campus Society")}</span>
                <span class="text-[11px] text-on-surface-variant font-mono block">${escapeHTML(event.organizer_handle || "@campus")}</span>
              </div>
            </div>

          </div>

        </div>

      </div>
    `;
  }

  // ============================================================
  // View 3: My Registrations Component
  // ============================================================
  function renderMyRegistrationsView() {
    const recent = state.lastRegistered;
    const isUpcoming = state.registrationTab === "upcoming";

    // Partition upcoming vs past
    const now = new Date();
    const upcomingList = [];
    const pastList = [];

    state.registrations.forEach(reg => {
      const ev = reg.events || {};
      const evDate = ev.starts_at ? new Date(ev.starts_at) : new Date(Date.now() + 86400000);
      if (evDate >= now) {
        upcomingList.push(reg);
      } else {
        pastList.push(reg);
      }
    });

    const displayList = isUpcoming ? upcomingList : pastList;

    return `
      <div class="max-w-6xl mx-auto px-4 sm:px-6">
        
        <!-- Celebration Banner (Shown if user just registered) -->
        ${recent ? `
          <div class="bg-gradient-to-r from-secondary/10 via-secondary-container/20 to-primary-container/10 border border-secondary/30 rounded-2xl p-6 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 animate-modal-enter shadow-sm">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-2xl bg-secondary text-white flex items-center justify-center shadow-md shadow-secondary/30 shrink-0">
                <span class="material-symbols-outlined text-[28px]">verified</span>
              </div>
              <div>
                <span class="px-2.5 py-0.5 rounded-full bg-secondary text-white text-[10px] font-bold uppercase tracking-wider">Registration Confirmed</span>
                <h3 class="text-lg font-black text-on-surface mt-1">You're confirmed for ${escapeHTML(recent.event?.title || "your event")}!</h3>
                <p class="text-xs text-on-surface-variant">Your ticket pass has been generated. You can download your pass or sync to calendar below.</p>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <button id="banner-view-pass" class="px-4 py-2 rounded-xl bg-secondary text-white font-bold text-xs flex items-center gap-1.5 shadow-sm hover:opacity-90">
                <span class="material-symbols-outlined text-[16px]">qr_code</span>
                <span>View Pass</span>
              </button>
              <button id="banner-add-cal" class="px-3.5 py-2 rounded-xl bg-surface-container-lowest text-on-surface font-semibold text-xs border border-surface-variant hover:bg-surface-container">
                <span class="material-symbols-outlined text-[16px]">event</span>
              </button>
            </div>
          </div>
        ` : ""}

        <!-- Heading & Toolbar -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-surface-container mb-6">
          <div>
            <h1 class="text-2xl sm:text-3xl font-black text-on-surface tracking-tight">My Registrations</h1>
            <p class="text-xs text-on-surface-variant mt-1">Keep track of the campus workshops and hackathons you've RSVP'd for.</p>
          </div>

          <!-- Tab Controls: Upcoming vs Past -->
          <div class="inline-flex p-1 bg-surface-container-low rounded-xl border border-surface-variant/80 gap-1 self-start sm:self-auto">
            <button class="px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${isUpcoming ? "bg-surface-container-lowest text-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"}"
                    id="tab-upcoming-btn">
              <span>Upcoming</span>
              <span class="px-1.5 py-0.2 rounded-full ${isUpcoming ? "bg-primary-fixed text-on-primary-fixed" : "bg-surface-container text-on-surface-variant"} text-[10px]">
                ${upcomingList.length}
              </span>
            </button>
            <button class="px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${!isUpcoming ? "bg-surface-container-lowest text-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"}"
                    id="tab-past-btn">
              <span>Past Events</span>
              <span class="px-1.5 py-0.2 rounded-full ${!isUpcoming ? "bg-primary-fixed text-on-primary-fixed" : "bg-surface-container text-on-surface-variant"} text-[10px]">
                ${pastList.length}
              </span>
            </button>
          </div>
        </div>

        <!-- Registrations Cards Container -->
        ${state.loadingRegistrations ? `
          <div class="space-y-4">
            ${[1, 2].map(() => `
              <div class="bg-surface-container-lowest rounded-2xl p-5 border border-surface-variant flex gap-4">
                <div class="w-48 h-32 rounded-xl skeleton-shimmer shrink-0"></div>
                <div class="flex-1 space-y-3">
                  <div class="w-1/4 h-5 rounded skeleton-shimmer"></div>
                  <div class="w-1/2 h-6 rounded skeleton-shimmer"></div>
                  <div class="w-full h-4 rounded skeleton-shimmer"></div>
                </div>
              </div>
            `).join("")}
          </div>
        ` : displayList.length ? `
          <div class="space-y-4">
            ${displayList.map(reg => {
              const ev = reg.events || {};
              const evId = reg.event_id || ev.id;
              const dateText = ev.date_str || formatDate(ev.starts_at);
              const timeText = ev.time_str || formatTime(ev.starts_at);
              const imageUrl = ev.image_url || FALLBACK_COVER;
              const category = ev.category || "Workshop";

              return `
                <div class="event-card bg-surface-container-lowest rounded-2xl shadow-sm hover:shadow-md border border-surface-variant/80 overflow-hidden flex flex-col md:flex-row">
                  
                  <!-- Thumbnail -->
                  <div class="md:w-64 h-48 md:h-auto relative shrink-0 overflow-hidden bg-surface-container">
                    <img class="w-full h-full object-cover" src="${escapeHTML(imageUrl)}" alt="${escapeHTML(ev.title)}" />
                    <div class="absolute top-3 left-3">
                      <span class="px-2.5 py-1 rounded-full bg-surface-container-lowest/90 backdrop-blur-md text-primary font-bold text-[11px] shadow-sm flex items-center gap-1">
                        <span class="material-symbols-outlined text-[14px]">code</span>
                        <span>${escapeHTML(category)}</span>
                      </span>
                    </div>
                  </div>

                  <!-- Details -->
                  <div class="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div class="flex items-center justify-between gap-2 flex-wrap mb-2">
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-xs font-bold">
                          <span class="material-symbols-outlined text-[14px]">check</span> Registered
                        </span>
                        <span class="text-xs text-on-surface-variant font-mono">
                          ID: ${escapeHTML(String(reg.id).slice(0, 8))}
                        </span>
                      </div>

                      <h2 class="text-xl font-bold text-on-surface hover:text-primary transition-colors">
                        <a href="#/events/${encodeURIComponent(evId)}">${escapeHTML(ev.title || "Campus Event")}</a>
                      </h2>

                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 text-xs text-on-surface-variant">
                        <div class="flex items-center gap-2">
                          <span class="material-symbols-outlined text-[16px] text-primary">calendar_today</span>
                          <span>${escapeHTML(dateText)} • ${escapeHTML(timeText)}</span>
                        </div>
                        <div class="flex items-center gap-2">
                          <span class="material-symbols-outlined text-[16px] text-outline">location_on</span>
                          <span class="truncate">${escapeHTML(ev.location || "Campus Hall")}</span>
                        </div>
                      </div>

                      <p class="text-xs text-on-surface-variant line-clamp-2 mt-2">
                        ${escapeHTML(ev.description || "Interactive campus workshop and hands-on session.")}
                      </p>
                    </div>

                    <!-- Actions Footer -->
                    <div class="pt-4 mt-4 border-t border-surface-container flex flex-wrap items-center justify-between gap-3">
                      <div class="flex items-center gap-2">
                        <button class="reg-view-ticket-btn h-9 px-4 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-container transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                                data-reg-id="${escapeHTML(reg.id)}" data-ev-id="${escapeHTML(evId)}">
                          <span class="material-symbols-outlined text-[16px]">qr_code</span>
                          <span>Ticket Pass</span>
                        </button>
                        <button class="reg-cal-btn h-9 px-3.5 rounded-xl bg-surface-container text-on-surface text-xs font-semibold hover:bg-surface-variant transition-colors flex items-center gap-1"
                                data-reg-id="${escapeHTML(reg.id)}" data-ev-id="${escapeHTML(evId)}">
                          <span class="material-symbols-outlined text-[16px]">event</span>
                          <span>Calendar</span>
                        </button>
                      </div>

                      <div class="flex items-center gap-2">
                        <button class="reg-cancel-btn text-xs text-outline hover:text-error font-medium px-2 py-1 transition-colors"
                                data-reg-id="${escapeHTML(reg.id)}" data-title="${escapeHTML(ev.title)}">
                          Cancel RSVP
                        </button>
                        <a href="#/events/${encodeURIComponent(evId)}" class="text-xs font-bold text-primary hover:underline">
                          Event Details →
                        </a>
                      </div>
                    </div>

                  </div>

                </div>
              `;
            }).join("")}
          </div>
        ` : `
          <div class="bg-surface-container-lowest rounded-2xl p-12 text-center border border-surface-variant max-w-lg mx-auto">
            <div class="w-16 h-16 rounded-full bg-surface-container mx-auto flex items-center justify-center text-outline mb-4">
              <span class="material-symbols-outlined text-[32px]">event_note</span>
            </div>
            <h3 class="text-lg font-bold text-on-surface">No ${isUpcoming ? "upcoming" : "past"} registrations</h3>
            <p class="text-sm text-on-surface-variant mt-1 mb-6">Explore the semester catalog to discover workshops and save your place.</p>
            <a href="#/events" class="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold shadow-sm hover:bg-primary-container">
              <span class="material-symbols-outlined text-[16px]">explore</span>
              <span>Browse Campus Events</span>
            </a>
          </div>
        `}

        <!-- Student Engagement Bento Strip -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div class="bg-surface-container-lowest rounded-2xl p-5 border border-surface-variant/80 flex items-center gap-4 shadow-sm">
            <div class="w-12 h-12 rounded-xl bg-primary-container/10 flex items-center justify-center text-primary shrink-0">
              <span class="material-symbols-outlined text-2xl">confirmation_number</span>
            </div>
            <div>
              <span class="text-xl font-black text-on-surface block">${state.registrations.length} Events</span>
              <span class="text-xs text-on-surface-variant">Active semester participation</span>
            </div>
          </div>

          <div class="bg-surface-container-lowest rounded-2xl p-5 border border-surface-variant/80 flex items-center gap-4 shadow-sm">
            <div class="w-12 h-12 rounded-xl bg-secondary-container/40 flex items-center justify-center text-secondary shrink-0">
              <span class="material-symbols-outlined text-2xl">workspace_premium</span>
            </div>
            <div>
              <span class="text-xl font-black text-on-surface block">Verified</span>
              <span class="text-xs text-on-surface-variant">Authenticated student pass</span>
            </div>
          </div>

          <div class="bg-surface-container-lowest rounded-2xl p-5 border border-surface-variant/80 flex items-center gap-4 shadow-sm">
            <div class="w-12 h-12 rounded-xl bg-tertiary-fixed flex items-center justify-center text-tertiary shrink-0">
              <span class="material-symbols-outlined text-2xl">notifications_active</span>
            </div>
            <div>
              <span class="text-xl font-black text-on-surface block">Reminders On</span>
              <span class="text-xs text-on-surface-variant">Email alerts 2h before sessions</span>
            </div>
          </div>
        </div>

      </div>
    `;
  }

  // ============================================================
  // Router & Route Transition Orchestration
  // ============================================================
  function parseHash() {
    const hash = window.location.hash.replace(/^#\/?/, "");
    const parts = hash.split("/").filter(Boolean);

    if (parts[0] === "events" && parts[1]) {
      return { page: "detail", id: decodeURIComponent(parts[1]) };
    }
    if (parts[0] === "registrations") {
      return { page: "registrations", id: null };
    }
    return { page: "events", id: null };
  }

  function updateNavigationUI() {
    const page = state.route.page;
    if (navEvents) {
      navEvents.classList.toggle("nav-active", page === "events");
    }
    if (navRegistrations) {
      navRegistrations.classList.toggle("nav-active", page === "registrations");
    }
  }

  async function handleRouteChange() {
    const prevRoute = state.route;
    state.route = parseHash();
    updateNavigationUI();

    // Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: "smooth" });

    if (state.route.page === "events") {
      if (!state.events.length) {
        await fetchEvents();
      } else {
        renderCurrentRoute();
      }
    } else if (state.route.page === "detail") {
      if (!state.detailEvent || state.detailEvent.id !== state.route.id) {
        await fetchEventDetail(state.route.id);
      } else {
        renderCurrentRoute();
      }
    } else if (state.route.page === "registrations") {
      await fetchRegistrations();
    }
  }

  function renderCurrentRoute() {
    let content = "";
    if (state.route.page === "events") {
      content = renderExploreCatalog();
    } else if (state.route.page === "detail") {
      content = renderEventDetailView();
    } else if (state.route.page === "registrations") {
      content = renderMyRegistrationsView();
    }

    appRoot.innerHTML = content;
    attachDynamicEventListeners();
  }

  // ============================================================
  // Dynamic Event Delegations & Micro-Interactions
  // ============================================================
  function attachDynamicEventListeners() {
    // Search input
    const searchInput = document.getElementById("event-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        state.search = e.target.value;
        const cursor = e.target.selectionStart;
        renderCurrentRoute();
        const refreshed = document.getElementById("event-search-input");
        if (refreshed) {
          refreshed.focus();
          refreshed.setSelectionRange(cursor, cursor);
        }
      });
    }

    // Clear search
    const clearSearchBtn = document.getElementById("clear-search-btn");
    if (clearSearchBtn) {
      clearSearchBtn.addEventListener("click", () => {
        state.search = "";
        renderCurrentRoute();
      });
    }

    // Reset filters
    const resetFiltersBtn = document.getElementById("reset-filters-btn");
    if (resetFiltersBtn) {
      resetFiltersBtn.addEventListener("click", () => {
        state.search = "";
        state.activeCategory = "all";
        renderCurrentRoute();
      });
    }

    // Category filter chips
    document.querySelectorAll(".filter-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        state.activeCategory = chip.dataset.category;
        renderCurrentRoute();
      });
    });

    // Event Detail Register Button
    const registerBtn = document.getElementById("register-btn");
    if (registerBtn) {
      registerBtn.addEventListener("click", () => {
        if (state.detailEvent) {
          registerForEvent(state.detailEvent);
        }
      });
    }

    // Event Detail View Ticket Button
    const viewTicketBtn = document.getElementById("view-ticket-btn");
    if (viewTicketBtn) {
      viewTicketBtn.addEventListener("click", () => {
        if (state.detailEvent) {
          const reg = getUserRegistration(state.detailEvent.id);
          openTicketModal(state.detailEvent, reg);
        }
      });
    }

    // Event Detail Cancel RSVP
    const cancelRsvpBtn = document.getElementById("cancel-rsvp-btn");
    if (cancelRsvpBtn) {
      cancelRsvpBtn.addEventListener("click", () => {
        if (state.detailEvent) {
          const reg = getUserRegistration(state.detailEvent.id);
          if (reg) {
            cancelRegistration(reg.id, state.detailEvent.title);
          }
        }
      });
    }

    // My Registrations Tab Switches
    const tabUpcoming = document.getElementById("tab-upcoming-btn");
    const tabPast = document.getElementById("tab-past-btn");
    if (tabUpcoming) {
      tabUpcoming.addEventListener("click", () => {
        state.registrationTab = "upcoming";
        renderCurrentRoute();
      });
    }
    if (tabPast) {
      tabPast.addEventListener("click", () => {
        state.registrationTab = "past";
        renderCurrentRoute();
      });
    }

    // Registrations Card Buttons
    document.querySelectorAll(".reg-view-ticket-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const evId = btn.dataset.evId;
        const regId = btn.dataset.regId;
        const reg = state.registrations.find(r => String(r.id) === String(regId));
        const ev = reg?.events || state.events.find(e => String(e.id) === String(evId));
        if (ev) {
          openTicketModal(ev, reg);
        }
      });
    });

    document.querySelectorAll(".reg-cal-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const evId = btn.dataset.evId;
        const reg = state.registrations.find(r => String(r.id) === btn.dataset.regId);
        const ev = reg?.events || state.events.find(e => String(e.id) === String(evId));
        if (ev) {
          downloadCalendarICS(ev);
        }
      });
    });

    document.querySelectorAll(".reg-cancel-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const regId = btn.dataset.regId;
        const title = btn.dataset.title || "event";
        cancelRegistration(regId, title);
      });
    });

    // Celebration Banner Buttons
    const bannerViewPass = document.getElementById("banner-view-pass");
    if (bannerViewPass && state.lastRegistered) {
      bannerViewPass.addEventListener("click", () => {
        openTicketModal(state.lastRegistered.event, { id: state.lastRegistered.id });
      });
    }

    const bannerAddCal = document.getElementById("banner-add-cal");
    if (bannerAddCal && state.lastRegistered) {
      bannerAddCal.addEventListener("click", () => {
        downloadCalendarICS(state.lastRegistered.event);
      });
    }
  }

  // ============================================================
  // Global Event Listeners & Modals
  // ============================================================
  if (closeTicketModalBtn) {
    closeTicketModalBtn.addEventListener("click", closeTicketModal);
  }

  if (ticketModal) {
    ticketModal.addEventListener("click", (e) => {
      if (e.target === ticketModal) closeTicketModal();
    });
  }

  if (downloadPassBtn) {
    downloadPassBtn.addEventListener("click", downloadTicketPass);
  }

  if (calendarPassBtn) {
    calendarPassBtn.addEventListener("click", () => {
      if (state.activeTicket) {
        downloadCalendarICS(state.activeTicket.event);
      }
    });
  }

  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener("click", () => {
      mobileMenu.classList.toggle("hidden");
    });
    document.querySelectorAll(".mobile-nav-link").forEach(link => {
      link.addEventListener("click", () => {
        mobileMenu.classList.add("hidden");
      });
    });
  }

  // Keyboard accessibility: Escape to close modals
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !ticketModal.classList.contains("hidden")) {
      closeTicketModal();
    }
  });

  // Routing listener
  window.addEventListener("hashchange", handleRouteChange);

  // ============================================================
  // Application Bootstrap Initialization
  // ============================================================
  async function init() {
    if (!window.location.hash) {
      window.location.hash = "#/events";
    }
    
    // Initial parallel load
    await Promise.all([
      fetchEvents(),
      fetchRegistrations()
    ]);

    await handleRouteChange();
  }

  // Fire on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
