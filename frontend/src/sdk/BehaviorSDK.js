/**
 * NeoBank BehaviorSDK
 * Silently collects keystroke, mouse, scroll, and click events.
 * Flushes every 8 seconds to /api/behavior/events.
 */
export class BehaviorSDK {
  constructor(userId, onScoreUpdate) {
    this.userId       = userId;
    this.onScoreUpdate = onScoreUpdate;
    this.buffer       = [];
    this.running      = false;
    this.flushTimer   = null;

    this.keyCount     = 0;
    this.sessionStart = null;

    // Keystroke tracking
    this.keyDownTimes    = {};
    this.lastKeyUpTime   = null;

    // Mouse tracking
    this.lastMouseX    = null;
    this.lastMouseY    = null;
    this.lastMouseTime = null;
    this.lastVelocity  = null;

    // Scroll tracking
    this.lastScrollY    = null;
    this.lastScrollTime = null;

    // Click tracking
    this.clickDownTime = null;

    // Bind handlers so removeEventListener works
    this._onKeyDown   = this._onKeyDown.bind(this);
    this._onKeyUp     = this._onKeyUp.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onScroll    = this._onScroll.bind(this);
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseUp   = this._onMouseUp.bind(this);
  }

  start() {
    if (this.running) return;
    this.running = true;

    document.addEventListener("keydown",   this._onKeyDown,   { capture: true });
    document.addEventListener("keyup",     this._onKeyUp,     { capture: true });
    document.addEventListener("mousemove", this._onMouseMove, { passive: true });
    document.addEventListener("scroll",    this._onScroll,    { passive: true, capture: true });
    document.addEventListener("mousedown", this._onMouseDown, { passive: true });
    document.addEventListener("mouseup",   this._onMouseUp,   { passive: true });

    // Flush events every 8 seconds
    this.flushTimer = setInterval(() => this._flush(), 8000);
    console.log("[NeoBank SDK] Behavioral monitoring started");
  }

  stop() {
    if (!this.running) return;
    this.running = false;

    document.removeEventListener("keydown",   this._onKeyDown,   { capture: true });
    document.removeEventListener("keyup",     this._onKeyUp,     { capture: true });
    document.removeEventListener("mousemove", this._onMouseMove);
    document.removeEventListener("scroll",    this._onScroll,    { capture: true });
    document.removeEventListener("mousedown", this._onMouseDown);
    document.removeEventListener("mouseup",   this._onMouseUp);

    if (this.flushTimer) clearInterval(this.flushTimer);
    this._flush(); // Final flush on stop
    console.log("[NeoBank SDK] Behavioral monitoring stopped");
  }

  _now() {
    return performance.timeOrigin + performance.now();
  }

  _push(event) {
    this.buffer.push({ ...event, timestamp: this._now() });
  }

  _onKeyDown(e) {
    this.keyDownTimes[e.key] = this._now();
  }

  _onKeyUp(e) {
    const now  = this._now();
    const down = this.keyDownTimes[e.key];
    if (!down) return;
  
    const dwell  = now - down;
    const flight = this.lastKeyUpTime ? now - this.lastKeyUpTime : undefined;
  
    // Typing speed: chars typed per minute rolling count
    this.keyCount = (this.keyCount || 0) + 1;
    if (!this.sessionStart) this.sessionStart = now;
    const elapsedMin = (now - this.sessionStart) / 60000;
    const wpm = elapsedMin > 0 ? (this.keyCount / 5) / elapsedMin : 0; // 5 chars = 1 word
  
    delete this.keyDownTimes[e.key];
    this._push({
      event_type:   "keystroke",
      key:          e.key,
      dwell_time:   dwell,
      flight_time:  flight,
      wpm:          wpm,
    });
    this.lastKeyUpTime = now;
  }

  _onMouseMove(e) {
    const now = this._now();
    let velocity, acceleration;

    if (this.lastMouseX !== null && this.lastMouseTime !== null) {
      const dt   = now - this.lastMouseTime;
      if (dt > 0) {
        const dx   = e.clientX - this.lastMouseX;
        const dy   = e.clientY - (this.lastMouseY || 0);
        const dist = Math.sqrt(dx * dx + dy * dy);
        velocity   = dist / dt;
        if (this.lastVelocity !== null) {
          acceleration = (velocity - this.lastVelocity) / dt;
        }
        this.lastVelocity = velocity;
      }
    }

    this._push({ event_type: "mouse", mouse_x: e.clientX, mouse_y: e.clientY, mouse_velocity: velocity, mouse_acceleration: acceleration });
    this.lastMouseX    = e.clientX;
    this.lastMouseY    = e.clientY;
    this.lastMouseTime = now;
  }

  _onScroll() {
    const now     = this._now();
    const scrollY = window.scrollY;
    let delta, velocity;

    if (this.lastScrollY !== null && this.lastScrollTime !== null) {
      delta    = scrollY - this.lastScrollY;
      const dt = now - this.lastScrollTime;
      velocity = dt > 0 ? Math.abs(delta) / dt : 0;
    }

    this._push({ event_type: "scroll", scroll_delta: delta, scroll_velocity: velocity });
    this.lastScrollY    = scrollY;
    this.lastScrollTime = now;
  }

  _onMouseDown(e) {
    this.clickDownTime = this._now();
    // pressure: 0.5 is default for mouse, varies on trackpad/touch
    this.clickPressure = e.pressure || (e.touches?.[0]?.force) || 0.5;
  }
  
  _onMouseUp(e) {
    if (!this.clickDownTime) return;
    const now = this._now();
    this._push({
      event_type:     "click",
      click_x:        e.clientX,
      click_y:        e.clientY,
      click_duration: now - this.clickDownTime,
      pressure:       this.clickPressure || 0.5,
    });
    this.clickDownTime = null;
  }

  async _flush() {
    if (this.buffer.length < 5) return; // Need minimum events to be useful
    const batch = this.buffer.splice(0, this.buffer.length);

    try {
      const token = localStorage.getItem("nb_token");
      const res = await fetch("/api/behavior/events", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ events: batch, sessionDurationMs: this._now() - (batch[0]?.timestamp || this._now()) }),
        keepalive: true,
      });

      if (res.ok) {
        const score = await res.json();
        if (this.onScoreUpdate) this.onScoreUpdate(score);

        // Auto-logout on block, warn user on challenge
        if (score.action === "block") {
          localStorage.clear();
          window.location.href = "/login?reason=security";
        } else if (score.action === "challenge") {
          setTimeout(() => {
            localStorage.clear();
            window.location.href = "/login?reason=security";
          }, 3000); // 3 second warning before logout
        }
      }
    } catch {
      // Re-queue on failure
      this.buffer.unshift(...batch);
    }
  }
}
